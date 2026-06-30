# Troubleshooting

Use this page when a local Naos project fails before the demo or package build
is healthy.

## Native Compiler Does Not Load

Run:

```sh
naos info
```

Published installs should load the matching `@naos-ui/compiler-*` optional
package. Repository development uses the local native binding:

```sh
pnpm build:native
```

See [Native distribution](native-distribution.md) for package names, loader
order, supported platforms, and the `NAOS_NATIVE_BINDING_PATH` override.

## `.wc.tsx` File Is Not Transformed

Check that:

* the file extension is `.wc.tsx`;
* `@naos-ui/vite` is installed and `naos()` is in the Vite plugin list;
* the plugin `include` and `exclude` options still match the file;
* the file is imported by the app or by a build entry.

## Unsupported TSX Diagnostics

Naos intentionally accepts a narrow TSX subset. Common unsupported patterns are
fragments, multiple root elements, unkeyed `.map()` children, block-bodied
`.map()` callbacks, conditional JSX outside `<Show>`, spread attributes, rest
props, and callback expression returns such as `() => <button />`.

Use [Compiler limitations](compiler-limitations.md) as the source of truth for
accepted and rejected syntax.

## Declarative Shadow DOM Looks Empty

Declarative Shadow DOM is emitted only through explicit prerendering:

```sh
naos prerender src/counter.wc.tsx --props '{"label":"Static"}'
```

The normal Vite transform emits a client Custom Element module. The Vite plugin
emits prerender metadata by default so static site builds can discover Naos
components, but it does not automatically write HTML for every component.

## CSS Is Missing In Prerendered HTML

Public component CSS should use Vite `?inline` imports:

```tsx
import css from "./counter.wc.css?inline"

export const options = {
  styles: [css],
}
```

When calling `renderDeclarativeShadowDom()` directly, pass resolved CSS text via
`inlineStyles` keyed by local import name. The CLI resolves local `?inline` CSS
imports before prerendering.

## Local Verification

From the workspace root:

```sh
pnpm install
pnpm build:native
pnpm check-types
pnpm test
pnpm --filter @naos-ui/example-counter type-check
pnpm --filter @naos-ui/example-counter build
pnpm --filter @naos-ui/example-counter test
```

Use [MVP verification](mvp-verification.md) for the full health checklist.
