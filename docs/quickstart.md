# Quickstart

This quickstart takes a new package consumer from install to a compiled Custom
Element. Repository contributors should also run the local native build step.

## Install Packages

```sh
pnpm add @naos-ui/core @naos-ui/runtime
pnpm add -D @naos-ui/compiler @naos-ui/vite @naos-ui/cli
```

`@naos-ui/compiler` resolves the matching optional native package for the current
platform. npm installs do not build native code from source.

For browser app-shell routing, add the optional router package:

```sh
pnpm add @naos-ui/router
```

For repository development, install dependencies and build the local native
binding from the workspace root:

```sh
pnpm install
pnpm build:native
```

## Configure TypeScript

Use the automatic JSX runtime and point `jsxImportSource` at `@naos-ui/core`.

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@naos-ui/core",
    "types": ["vite/client"]
  }
}
```

## Configure Vite

```ts
import { defineConfig } from "vite"
import { naos } from "@naos-ui/vite"

export default defineConfig({
  plugins: [naos()],
})
```

The default plugin filter transforms `.wc.tsx` files and excludes
`node_modules`. Vite owns the module graph, chunks, assets, CSS imports, and
cache invalidation.

## Write A Component

Create `src/counter.wc.tsx`:

```tsx
import { computed, event, on, state } from "@naos-ui/core"

export type CounterProps = {
  label?: string
}

export function Counter({ label = "Count" }: CounterProps = {}) {
  const count = state(0)
  const text = computed(() => `${label}: ${count()}`)
  const change = event<number>("change")

  return (
    <button
      part="button"
      data-count={count()}
      onClick={on("click", () => {
        count.set(count() + 1)
        change.emit(count())
      })}
    >
      {text()}
    </button>
  )
}
```

Import the component from your app entry:

```ts
import "./counter.wc.tsx"
```

Host pages consume the generated element as regular DOM:

```html
<x-counter label="Clicks"></x-counter>
```

## Run Local Checks

For a package app, run your normal Vite build. In this repository, use the demo
as the working proof:

```sh
pnpm --filter @naos-ui/example-counter type-check
pnpm --filter @naos-ui/example-counter build
pnpm --filter @naos-ui/example-counter test
```

Use the CLI for standalone smoke tests:

```sh
naos compile src/counter.wc.tsx -o dist/counter.js
naos prerender src/counter.wc.tsx --props '{"label":"Static"}' -o dist/counter.html
naos info
```

Next, read [Authoring](authoring.md), then
[Styling and Declarative Shadow DOM](styling-and-dsd.md).
