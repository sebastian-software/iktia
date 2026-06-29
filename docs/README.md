# Iktia Documentation

This directory is the source-level documentation map for the v0.1 prerelease.
Read it in order when you are new to Iktia; jump to the reference pages when
you already know the workflow.

## Learning Path

1. [Introduction](../README.md)
   Explains what Iktia is, where it fits, and why the compiler stays narrow.
2. [Quickstart](quickstart.md)
   Installs the packages, configures TypeScript and Vite, writes a component,
   and points to the demo commands.
3. [Authoring](authoring.md)
   Defines component files, props, state, computed values, effects, events,
   host helpers, `<Show>`, keyed `.map()`, slots, parts, and primitive
   contracts.
4. [Styling and Declarative Shadow DOM](styling-and-dsd.md)
   Describes flat CSS text imports, Shadow DOM output, explicit prerendering,
   hydration markers, and mismatch behavior.
5. [Vite](authoring.md#vite-setup)
   Shows the transform plugin, default `.wc.tsx` filter, and prerender
   metadata behavior.
6. [CLI](cli.md)
   Documents `iktia compile`, `iktia prerender`, and `iktia info`.
7. [Data Resources](data.md)
   Covers optional fetch and subscription resources for Custom Element data
   loading.
8. [Native Distribution](native-distribution.md)
   Explains optional native compiler packages, loader order, and local native
   builds.
9. [API Reference](api-reference.md)
   Summarizes the public v0.1 package and authoring API surface.
10. [Demos](demos.md)
   Maps the public demo sections to the compiler capabilities they prove.
11. [Troubleshooting](troubleshooting.md)
    Covers native binding loading, unsupported syntax, DSD output, CLI output,
    and local verification.

Architecture follow-up audits:

* [Base UI primitive architecture audit](base-ui-primitive-architecture-audit.md)
  maps Base UI's durable primitive lessons to Iktia's Web Components-first
  contracts without adopting Base UI as a dependency or API surface.

## Verification

Use [MVP verification](mvp-verification.md) for the complete local health
checklist. The most useful first pass is:

```sh
pnpm install
pnpm build:native
pnpm check-types
pnpm test
pnpm --filter @iktia/example-counter build
pnpm --filter @iktia/example-counter test
```

For the exact accepted and rejected TSX boundary, use
[Compiler limitations](compiler-limitations.md). For release and publishing
work, use [npm publishing](npm-publishing.md) and
[Native distribution](native-distribution.md).
