# npm Publishing

This runbook prepares the first public npm publish for the Iktia package set.
Use it when bootstrapping the `@iktia` packages and when validating later
manual release runs.

## Package Set

The public npm release set is:

* `@iktia/core`
* `@iktia/runtime`
* `@iktia/compiler`
* `@iktia/vite`
* `@iktia/cli`
* `@iktia/compiler-darwin-arm64`
* `@iktia/compiler-darwin-x64`
* `@iktia/compiler-linux-arm64-gnu`
* `@iktia/compiler-linux-arm64-musl`
* `@iktia/compiler-linux-x64-gnu`
* `@iktia/compiler-linux-x64-musl`
* `@iktia/compiler-win32-arm64-msvc`
* `@iktia/compiler-win32-x64-msvc`

The native packages must be published before `@iktia/compiler`, because
`@iktia/compiler` declares them as optional dependencies.

## First Publish

The first publish is the bootstrap step that makes package settings available
on npmjs.com. After that, configure Trusted Publishing for every package.

Do the first publish from GitHub Actions, not from a local machine. A local
machine can only build its host-native package, while the release workflow
builds the complete native matrix on the matching hosted runners.

Prerequisites:

* The npm organization `iktia` exists.
* The publisher is an owner of the `iktia` npm organization.
* The GitHub repository is public.
* The GitHub repository has a temporary `NPM_TOKEN` secret with publish access.
  Use a granular access token with read/write access for the `iktia` scope and
  `Bypass 2FA` enabled for this bootstrap run. GitHub Actions cannot answer an
  interactive one-time-password prompt during the native matrix publish.
* The release workflow uses GitHub-hosted runners, `id-token: write`, and Node
  `22.18.0` or newer.

Local preflight:

```sh
npm whoami
npm org ls iktia
pnpm install --frozen-lockfile
pnpm check-release-set
pnpm check-native-types
pnpm build
pnpm check
pnpm test
```

Package preflight:

```sh
(cd packages/core && npm pack --dry-run --json)
(cd packages/runtime && npm pack --dry-run --json)
(cd packages/compiler && npm pack --dry-run --json)
(cd packages/vite && npm pack --dry-run --json)
(cd packages/cli && npm pack --dry-run --json)
```

For native packages, only dry-run the package that matches the current host
unless the `.node` artifact for that package was built in the same environment.
The release workflow performs the full native package dry-run and publish on
the target runners.

Manual workflow sequence:

1. Dispatch `.github/workflows/release.yml` with `dry_run=true`.
2. Confirm every native package builds, smoke-tests, and dry-runs first.
3. Confirm the JavaScript package job verifies, builds, and dry-runs after the
   native matrix.
4. Dispatch the same workflow with `dry_run=false`.
5. Verify all packages exist on npm with version `0.0.0`.

Do not rerun `dry_run=false` for the same version. npm versions are immutable.

After the first publish, delete the temporary `NPM_TOKEN` repository secret and
revoke the npm token unless another bootstrap run is still required.

## Trusted Publishing Setup

After the first publish, configure a Trusted Publisher on npmjs.com for each
package:

* Provider: GitHub Actions
* Organization or user: `sebastian-software`
* Repository: `iktia`
* Workflow filename: `release.yml`
* Allowed actions: `npm publish`
* Environment name: empty, unless the release workflow starts using a protected
  GitHub environment

After Trusted Publishing is configured and a publish has been verified through
OIDC, remove the temporary publish token and restrict token publishing in npm
package settings.

## Notes

The workflow keeps `--provenance` on publish commands. npm also generates
provenance automatically for public packages published from public GitHub
repositories through Trusted Publishing.

If a publish fails with authentication errors, check the exact workflow filename
configured on npmjs.com, the `id-token: write` permission, and that the workflow
is running on GitHub-hosted runners.
