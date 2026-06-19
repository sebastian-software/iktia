# Compiler Diagnostics

Iktia compiler failures are exposed as structured `diagnostics[]` entries from
the native compiler API and rendered by the CLI and Vite plugin. Each diagnostic
has a stable `code`, `severity`, `message`, `filename`, optional `span`, and
optional `hint`.

Source spans are part of the public diagnostic shape. The current compiler
catalog documents unsupported authoring boundaries first; these entries
currently report `span: null` until span-rich rejection paths are implemented.

## Catalog

| Code | Meaning | Hint direction |
| --- | --- | --- |
| `IKTIA_PARSE_MODULE_SOURCE` | OXC could not parse the module as TypeScript or TSX. | Fix TypeScript/TSX syntax before Iktia analysis runs. |
| `IKTIA_COMPONENT_NOT_FOUND` | The module did not export a supported PascalCase function component. | Export a supported function component from a `.wc.tsx` module. |
| `IKTIA_COMPONENT_TEMPLATE_REQUIRED` | A supported function component did not return a TSX template. | Return a parenthesized TSX template from the component. |
| `IKTIA_REMOVED_AUTHORING_API` | Removed v0.1 APIs such as `component()`, `signal()`, `prop()`, or `useHost()` were used. | Use the v0.1 function component authoring API. |
| `IKTIA_UNSUPPORTED_COMPONENT_OPTIONS` | Component options used public fields outside `styles`. | Use `export const options = { styles: [...] } satisfies ComponentOptions`. |
| `IKTIA_UNSUPPORTED_FUNCTION_PROPS` | Function props used unsupported destructuring such as rest props. | Declare explicit destructured props with defaults. |
| `IKTIA_UNSUPPORTED_COMPUTED_CALLBACK` | `computed()` did not use the supported arrow-expression callback form. | Check the v0.1 authoring limitations. |
| `IKTIA_UNSUPPORTED_EFFECT_CALLBACK` | `effect()` did not use the supported arrow callback shape. | Check the v0.1 authoring limitations. |
| `IKTIA_UNSUPPORTED_LIST_RENDERER` | A list expression did not match the supported keyed `.map()` or `<For>` shape. | Return one keyed JSX element from a simple arrow callback. |
| `IKTIA_UNSUPPORTED_CONDITIONAL_JSX` | Conditional JSX was authored outside the explicit control-flow primitive. | Use `<Show when={...} fallback={...}>`. |
| `IKTIA_UNSUPPORTED_SHOW_FALLBACK` | `<Show fallback>` was present without a value. | Provide a static, expression, or JSX fallback value. |
| `IKTIA_TEMPLATE_PARSE` | The TSX template slice did not match Iktia's supported template grammar. | Check the v0.1 authoring limitations. |
| `IKTIA_DSD_INPUT` | Declarative Shadow DOM props or inline styles were not valid JSON objects. | Pass JSON objects for DSD props and inline styles. |
| `IKTIA_UNSUPPORTED_SYNTAX` | A syntax boundary is unsupported but not yet assigned a narrower catalog code. | Check the v0.1 authoring limitations. |
| `IKTIA_INTERNAL_PATTERN` | A compiler-internal pattern failed. | Report this as an Iktia compiler bug. |

## Compatibility

Callers should switch on `code` for control flow and render `message` plus
`hint` for humans. The `message` text may become more specific over time, but a
cataloged `code` should remain stable for the represented boundary.
