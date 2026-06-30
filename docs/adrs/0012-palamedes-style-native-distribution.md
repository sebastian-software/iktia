# ADR 0012: Palamedes-Style Native Distribution

Status: Accepted

Weight: P1

## Context

Naos's compiler is Rust-first and initially reached Node through a local
N-API binding copied to `packages/compiler/native/naos-node.node`. That is
enough for repository development, but it is not a publishable distribution
model.

Palamedes already solved the same class of problem: one Rust semantic core, one
N-API binding crate, one platform-aware TypeScript wrapper, and
platform-specific optional npm packages.

## Decision

Adopt the Palamedes native distribution model for v0.1.

`@naos-ui/compiler` is the public TypeScript compiler API and platform-aware
loader. It has optional dependencies on native packages that contain the
compiled `.node` artifacts:

* `@naos-ui/compiler-darwin-arm64`
* `@naos-ui/compiler-darwin-x64`
* `@naos-ui/compiler-linux-arm64-gnu`
* `@naos-ui/compiler-linux-arm64-musl`
* `@naos-ui/compiler-linux-x64-gnu`
* `@naos-ui/compiler-linux-x64-musl`
* `@naos-ui/compiler-win32-arm64-msvc`
* `@naos-ui/compiler-win32-x64-msvc`

Native packages are CommonJS packages whose `main` points directly at
`./naos-node.node`. Package manifests must include correct `os`, `cpu`, and
Linux `libc` metadata.

Loader resolution order:

1. explicit environment override for diagnostics and local testing;
2. installed optional native package;
3. workspace local binding for repository development;
4. source-build guidance for contributors.

Normal npm installs do not compile native code from source. Source builds are a
contributor-only path. `naos-core` and `naos-node` are not published to
crates.io for v0.1.

The N-API boundary remains workflow-oriented. Naos should expose meaningful
native operations such as `transformComponent()` and
`renderDeclarativeShadowDom()`, not many small helper calls.

Generated TypeScript declarations derived from `crates/naos-node` are the
source of truth for the JS-visible native boundary and must be checked in CI.

## Alternatives

* Keep one package with an embedded local native artifact.
* Compile native code during npm install.
* Publish Rust crates first and let users build their own Node binding.
* Replace N-API with WASM for v0.1.

## Consequences

* Release automation must publish native packages before JavaScript packages.
* CI needs a full native build matrix.
* Loader errors can be precise about platform, libc, and attempted package.
* Native type generation becomes part of the normal verification path.

## Related Milestones

v0.1 M5, M7
