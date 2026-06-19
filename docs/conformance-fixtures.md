# Compiler Conformance Fixtures

The compiler conformance suite lives in
`crates/iktia-core/tests/fixtures/conformance` and is exercised by
`crates/iktia-core/tests/conformance.rs`. It defines the local, reviewable
boundary for authoring patterns that Iktia accepts, rejects, and prerenders as
Declarative Shadow DOM.

## Fixture Groups

Accepted fixtures belong in `accepted/`. Each fixture should be a small
`.wc.tsx` component that maps to public authoring documentation and checks
stable generated-output signals rather than every byte of emitted JavaScript.
Use this group for supported component declarations, props, `state()`,
`computed()`, `effect()`, `event()`, `host()`, `on()`, `<Show>`, keyed `.map()`,
CSS `styles`, slots, parts, `data-*`, and `aria-*`.

Rejected fixtures belong in `rejected/`. Each fixture should demonstrate one
unsupported authoring pattern and assert the diagnostic code, message fragment,
severity, filename, and remediation hint. Keep one rejection reason per fixture
so failures point to the compiler boundary that changed.

Declarative Shadow DOM fixtures belong in `dsd/`. Use these for static shell
serialization, inline CSS resolution, prop/state snapshots, and hydration marker
coverage. DSD fixtures should also assert that event-handler or runtime-only
code does not leak into prerendered HTML.

## Adding Coverage

When adding or changing compiler syntax:

1. Add an accepted fixture when the syntax is supported.
2. Add a rejected fixture when the syntax must fail fast.
3. Add a DSD fixture when prerendered HTML has a public contract.
4. Prefer stable snippets such as tag names, attributes, diagnostic codes, and
   marker attributes over full generated-output snapshots.
5. Keep broader byte-for-byte output contracts in generated-output tests.

Run the local conformance suite from the workspace root:

```sh
cargo test -p iktia-core --test conformance
```
