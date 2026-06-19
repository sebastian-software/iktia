# API Reference

This page summarizes the public v0.1 package surface. Rust crates are internal
for v0.1 and are not published to crates.io.

## Packages

| Package | Public role |
| --- | --- |
| `@iktia/core` | Authoring primitives and JSX runtime types. |
| `@iktia/runtime` | Tiny platform helpers for generated output. |
| `@iktia/compiler` | Node wrapper around the native compiler. |
| `@iktia/compiler-*` | Platform-specific optional native compiler bindings. |
| `@iktia/vite` | Vite transform and prerender metadata plugin. |
| `@iktia/cli` | `iktia compile`, `iktia prerender`, and `iktia info`. |

## `@iktia/core`

| Export | Stability | Purpose |
| --- | --- | --- |
| `state(initialValue)` | Public | Writable local component state. |
| `computed(() => value)` | Public | Read-only derived value. |
| `effect(() => cleanup?)` | Public | Lifecycle-aware side effect with optional cleanup. |
| `event<Detail>(name)` | Public | Typed `CustomEvent` dispatcher. |
| `on(name, handler, options?)` | Public | Typed DOM listener helper. |
| `host()` | Public | Current element, root, update handle, and abort signal. |
| `Show` | Public | Explicit conditional control-flow primitive. |
| `ComponentOptions` | Public | Component-level `styles` metadata. |

Authoring primitives are compile-time APIs. They throw if a `.wc.tsx` module is
executed without the compiler transform.

Generated `state.set()` and `state.update()` calls are batched into a microtask.
Use `host().flushSync()` when a handler must observe the updated DOM
immediately after changing state. `host().update()` requests a batched update.

## `@iktia/compiler`

```ts
type TransformComponentRequest = {
  filename: string
  source: string
}

type TransformComponentResult = {
  code: string
  hasChanged: boolean
  map?: SourceMap
}

type RenderDeclarativeShadowDomRequest = {
  filename: string
  source: string
  props?: Record<string, unknown>
  inlineStyles?: Record<string, string>
}
```

Compiler failures throw `IktiaCompilerError` with structured `diagnostics[]`.
Diagnostics include code, severity, message, filename, optional span, and
optional hint.

## `@iktia/vite`

`iktia(options)` transforms accepted `.wc.tsx` modules and emits prerender
metadata by default for static HTML workflows. Set `prerender: false` only for
builds that never need Declarative Shadow DOM metadata.

## `@iktia/cli`

| Command | Purpose |
| --- | --- |
| `iktia compile <input>` | Transform one `.wc.tsx` module to JavaScript. |
| `iktia prerender <input>` | Emit Declarative Shadow DOM host HTML. |
| `iktia info` | Print platform and native compiler metadata. |

See [CLI](cli.md) for options and examples.
