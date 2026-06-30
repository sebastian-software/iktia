# Native Distribution

Naos ships the public compiler API through `@naos-ui/compiler`. The Rust N-API
binding is distributed through platform-specific optional packages, so normal
npm installs do not require a Rust toolchain.

## Package Matrix

| Rust target | npm package | Node platform | Node arch | libc | Artifact |
| --- | --- | --- | --- | --- | --- |
| `aarch64-apple-darwin` | `@naos-ui/compiler-darwin-arm64` | `darwin` | `arm64` | - | `naos-node.node` |
| `x86_64-apple-darwin` | `@naos-ui/compiler-darwin-x64` | `darwin` | `x64` | - | `naos-node.node` |
| `aarch64-unknown-linux-gnu` | `@naos-ui/compiler-linux-arm64-gnu` | `linux` | `arm64` | `glibc` | `naos-node.node` |
| `aarch64-unknown-linux-musl` | `@naos-ui/compiler-linux-arm64-musl` | `linux` | `arm64` | `musl` | `naos-node.node` |
| `x86_64-unknown-linux-gnu` | `@naos-ui/compiler-linux-x64-gnu` | `linux` | `x64` | `glibc` | `naos-node.node` |
| `x86_64-unknown-linux-musl` | `@naos-ui/compiler-linux-x64-musl` | `linux` | `x64` | `musl` | `naos-node.node` |
| `aarch64-pc-windows-msvc` | `@naos-ui/compiler-win32-arm64-msvc` | `win32` | `arm64` | - | `naos-node.node` |
| `x86_64-pc-windows-msvc` | `@naos-ui/compiler-win32-x64-msvc` | `win32` | `x64` | - | `naos-node.node` |

All native packages are CommonJS packages whose `main` points directly at
`./naos-node.node`. Linux package manifests use npm `libc` metadata.

## Loader Resolution

`@naos-ui/compiler` resolves native bindings in this order:

1. `NAOS_NATIVE_BINDING_PATH`, for diagnostics and explicit local testing.
2. The matching optional native package.
3. The workspace local binding at `packages/compiler/native/naos-node.node`.
4. A clear error with supported packages and contributor source-build guidance.

Linux GNU versus musl is detected through `process.report.getReport()`.

## Contributor Builds

Repository development still uses a local source build:

```sh
pnpm -w build:native
```

That builds `crates/naos-node` and copies the host binding to
`packages/compiler/native/naos-node.node`.

Native package builds use:

```sh
pnpm --filter @naos-ui/compiler-darwin-arm64 build
```

The native package build script supports these environment variables:

* `NAOS_RUST_PROFILE=release` for release artifacts.
* `NAOS_CARGO_TARGET=<rust-target>` to force a Rust target triple.
* `NAOS_CARGO_SUBCOMMAND=<build|zigbuild>` to override the Cargo subcommand.
* `NAOS_CARGO=<path>` to override the Cargo executable.

musl targets default to `cargo zigbuild`. macOS builds are ad-hoc signed after
copying so Node can load the `.node` artifact reliably.

## Native Boundary Types

TypeScript declarations for the JS-visible N-API boundary are generated from
`crates/naos-node` via napi-rs type metadata:

```sh
pnpm --filter @naos-ui/compiler generate-native-types
pnpm check-native-types
```

The generated file is committed at
`packages/compiler/src/generated/naos-node-types.ts`.

## Crate Publishing

`naos-core` and `naos-node` are internal Rust crates for v0.1. They are not
published to crates.io. npm install source-build fallback is intentionally not
supported.

## npm Publishing

Use `docs/npm-publishing.md` for the first publish and Trusted Publishing
bootstrap runbook. The complete native matrix should be published from GitHub
Actions so every package is built on its matching hosted runner.
