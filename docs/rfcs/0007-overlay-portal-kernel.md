# RFC 0007: Overlay Portal Kernel

Status: Draft
Date: 2026-06-29

## Summary

Define the shared overlay contract for `@naos-ui/primitives` and the later
compiler-level `<Portal>` lowering. This RFC follows issue #35 and the Base UI
audit in issue #77 / PR #79.

The first implementation slice keeps physical overlay rendering inside the
primitive Shadow DOM, standardizes public overlay state hooks, and adds a small
package-private overlay behavior foundation. A later compiler slice can move
subtrees to a physical portal root after the style, theme, and DSD contract is
stable.

## Existing Constraints

* Naos output is platform-native Custom Elements.
* `@naos-ui/primitives` owns component behavior, parts, slots, state attributes,
  accessibility behavior, and primitive-specific CSS variables.
* `@naos-ui/runtime` must remain a tiny generated-code helper package.
* Primitive CSS is currently delivered through flat `ComponentOptions.styles`
  and Shadow DOM style injection.
* The theme package owns semantic CSS custom properties; primitive-specific
  overlay geometry variables belong to `@naos-ui/primitives`.
* DSD is a static HTML path, so physical portal movement cannot be required for
  initial prerender output.

## Decision

Split overlay work into two layers:

1. **Primitive overlay kernel**: package-private helpers in
   `@naos-ui/primitives` for state attributes, geometry CSS variables,
   Escape/outside-dismiss routing, layer stack ownership, and disconnect
   cleanup.
2. **Physical portal lowering**: later compiler/runtime work that can move a
   statically known subtree to a root outside its rendered position.

The first layer ships before the second. Current overlay primitives continue to
render in their Shadow DOM, but expose the public contract that physical
portals must preserve.

## Public Overlay Contract

Overlay-capable primitives expose these stable hooks on their root, positioner,
popup/content, backdrop, or equivalent parts when applicable:

| Hook | Meaning |
| --- | --- |
| `data-naos-overlay` | Overlay family, such as `dialog`, `popover`, `menu`, `select`, or `tooltip`. |
| `data-state="open|closed"` | Logical open state. |
| `data-modal` | Present for modal overlays. |
| `data-side="top|right|bottom|left|none"` | Resolved popup side once positioning reports it. |
| `data-align="start|center|end"` | Resolved popup alignment once positioning reports it. |
| `data-anchor-hidden` | Anchor is clipped or hidden. |
| `data-layer` | Optional layer index/debug hook. |

Overlay-capable primitives reserve these CSS variables:

| Variable | Meaning |
| --- | --- |
| `--naos-anchor-width` | Anchor border-box width. |
| `--naos-anchor-height` | Anchor border-box height. |
| `--naos-available-width` | Collision-aware available width. |
| `--naos-available-height` | Collision-aware available height. |
| `--naos-popup-width` | Resolved popup width. |
| `--naos-popup-height` | Resolved popup height. |
| `--naos-positioner-width` | Positioner width, when the positioner is distinct. |
| `--naos-positioner-height` | Positioner height, when the positioner is distinct. |
| `--naos-transform-origin` | Transform origin for scale/opacity transitions. |

The first implementation does not guarantee that every variable is populated by
every primitive. The guarantee is naming, ownership, and compatibility: once a
primitive publishes a variable, it uses this vocabulary.

## Style Delivery Strategy

Physical portals create two style problems:

* component CSS no longer lives next to the moved DOM subtree;
* scoped theme variables can change because the subtree leaves its original DOM
  ancestry.

The accepted first strategy is:

1. Keep current overlay DOM inside the primitive Shadow DOM until the public
   overlay contract and tests are stable.
2. Use `part`, `data-*`, ARIA, and `--naos-*` CSS variables as the public
   styling surface.
3. For future physical portals, move an overlay subtree only through an Naos
   portal host that can carry component styles and a theme-variable bridge.

The later compiler portal lowering must choose one of these delivery modes per
component:

| Mode | Use |
| --- | --- |
| Shadow-preserving portal root | Preferred for generated primitives that need encapsulated CSS. The portal root owns a shadow root and receives the component styles once. |
| Constructable stylesheet reuse | Optional optimization when the support matrix and CSP policy allow it. |
| Light DOM portal | Allowed only for primitives whose public CSS contract is entirely `part`, attributes, ARIA, and inherited CSS custom properties. |

Plain `appendChild(document.body)` is not an accepted stable primitive strategy
because it drops scoped theme inheritance and makes DSD semantics ambiguous.

## Behavior Kernel Scope

The package-private overlay kernel owns:

* layer stack registration and top-layer checks;
* Escape routing;
* outside interaction classification;
* modal versus non-modal ownership metadata;
* state attribute and CSS variable normalization;
* disconnect cleanup contracts.

The kernel does not own:

* rendering;
* CSS;
* framework adapters;
* router navigation;
* application data;
* full physical portal movement.

## Implementation Status

This RFC's first implementation adds `packages/primitives/src/internal/behavior/overlay.ts`
with:

* `getNaosOverlayStateAttributes(...)`;
* `getNaosOverlayGeometryStyle(...)`;
* `createNaosOverlayLayerStack()`;
* `shouldCloseNaosOverlayForKey(...)`;
* `isNaosOverlayOutsideEventPath(...)`;
* `listenForNaosOverlayEscape(...)`.

The existing combobox, context menu, dialog, hover card, menu, popover, select,
and tooltip primitives use the shared state attributes. Context menu, dialog,
hover card, menu, popover, and tooltip also use the shared Escape listener
instead of local one-off listeners.

## Follow-Up Work

* Populate side, align, anchor-hidden, and geometry variables from the Zag
  positioner APIs where those APIs expose stable state.
* Add browser tests for Escape routing, outside interaction, focus return,
  focus trap, scroll lock, and disconnect cleanup across dialog, popover, menu,
  tooltip, and select.
* Design the physical portal host and theme-variable bridge before adding
  compiler-level `<Portal>` lowering.
* Feed animation mount/unmount phases into issue #36 instead of overloading
  this RFC.

## Acceptance Criteria

* Overlay primitives expose a shared state vocabulary.
* The first overlay helper is package-private to `@naos-ui/primitives`.
* No React, Base UI, Radix, MUI, Lit, or framework runtime dependency is added.
* `@naos-ui/runtime` does not gain component or overlay semantics.
* Physical portal movement remains deferred until style, theme, and DSD
  behavior have their own implementation slice.
