# RFC 0002: Zag-Backed Primitives Roadmap

Status: Draft
Date: 2026-06-18

## Summary

Turn `@iktia/primitives` into a Zag-backed Core Design System package. Iktia
will keep the public API, Custom Element output, slots, parts, form behavior,
events, and CSS custom properties. Zag machines will provide internal behavior
for complex state, ARIA wiring, keyboard interaction, focus management,
selection, dismiss behavior, overlays, and advanced input logic.

This roadmap supersedes the earlier "reference only" Zag posture for core
components. The implementation spikes proved that a Custom Element service layer
is feasible and small enough to justify the tradeoff. The current proof is:

* `createZagService(...)`: 239 lines of internal service runner code.
* `createZagTabsProbe(...)`: 100 lines of Tabs-specific probe adapter.
* The probe drives the real `@zag-js/tabs` machine through `connect()`, click
  value changes, `ARROW_NEXT` selection, and scope-backed focus movement.

The goal is Core Design System coverage first, not full Zag catalog parity.
Specialized widgets remain deferred until the core component set is stable.

## Decisions

* Zag packages are acceptable runtime dependencies for `@iktia/primitives`.
* Zag APIs remain private implementation details. Users import only Iktia
  primitives.
* Existing simple primitives should migrate to Zag when a matching Zag machine
  exists and the public DOM contract can be preserved.
* Public Iktia events remain Iktia-prefixed, such as `iktia-change`,
  `iktia-open-change`, `iktia-select`, `iktia-input`, and `iktia-invalid`.
* Public item APIs use subcomponents rather than array-only props, for example
  `<iktia-select-item>` and `<iktia-tab-panel>`.
* The compiler must support JSX spread on native elements so Zag prop bags can
  be applied without manual attribute and listener mapping.
* Components remain experimental until form, keyboard, focus, Shadow DOM, and
  cross-browser tests are green.

## Milestones

### M1: Production Zag Adapter Foundation

Promote the spike code into a stable internal adapter module, likely under
`packages/primitives/src/internal/zag/`.

Deliverables:

* Harden `createZagService(machine, props, scope)`.
* Add `createZagScope(host, shadowRoot)` for Shadow DOM-aware element lookup,
  active element lookup, documents, windows, and cleanup.
* Add `normalizeZagProps` for native element prop bags.
* Support machine props, bindable context, refs, guards, actions, root/state
  transitions, entry/exit actions, effects, watch/track, and disconnect cleanup.
* Keep adapter exports package-private.

Acceptance criteria:

* Tabs service tests prove click, keyboard selection, and focus movement through
  the real Zag machine.
* Cleanup tests prove observers, scheduled callbacks, dismissable layers, and
  focus helpers do not leak after disconnect.
* The adapter stays below the agreed budget unless a later review accepts the
  added complexity. Current reference budget is roughly 350-600 lines for the
  reusable layer.

### M2: JSX Spread Support For Native Elements

Add compiler support for Zag prop bags in `.wc.tsx`.

Supported source shape:

```tsx
<button {...api.getTriggerProps({ value })}>Label</button>
<div {...api.getContentProps({ value })}><slot /></div>
```

Deliverables:

* Parse native JSX spread attributes.
* Generate mount and update code for spread attributes, properties, styles, and
  event listeners.
* Replace old spread listeners safely on update.
* Define precedence: explicit JSX attributes after a spread override spread
  values; explicit attributes before a spread can be overwritten by the spread.
* Reject spreads on PascalCase child components until a later compiler milestone
  designs that contract.

Acceptance criteria:

* Rust compiler tests cover static and dynamic spread output.
* Generated output has no free identifiers.
* Event listener replacement does not duplicate handlers.
* Existing non-spread components keep their current behavior.

### M3: Migrate Existing Matching Primitives

Move existing components to Zag where it provides a matching machine and the
public contract can be preserved.

Initial migration targets:

* `<iktia-checkbox>` -> `@zag-js/checkbox`
* `<iktia-toggle>` -> `@zag-js/toggle`
* `<iktia-tabs>` -> `@zag-js/tabs`

Keep native or structural components as-is unless Zag adds clear value:

* `<iktia-button>` remains a native button primitive.
* `<iktia-field>` remains a label, hint, status, and layout shell.
* `<iktia-button-group>` remains structural until a segmented or toggle-group
  primitive is added.

Acceptance criteria:

* Existing browser tests still pass.
* `name`, `value`, reset, disabled fieldset propagation, and `FormData` still
  work for custom form controls.
* Existing Iktia events keep their names and payload shape unless a separate RFC
  accepts a breaking change.

### M4: Core Collection Components

Add collection-driven primitives using subcomponent public APIs.

Components:

* Tabs: `<iktia-tabs>`, `<iktia-tab>`, `<iktia-tab-panel>`
* Radio: `<iktia-radio-group>`, `<iktia-radio>`
* Segmented controls: `<iktia-segmented-control>`, `<iktia-segmented-item>`
* Toggle groups: `<iktia-toggle-group>`, `<iktia-toggle-item>`
* Selection: `<iktia-select>`, `<iktia-select-item>`
* Combobox: `<iktia-combobox>`, `<iktia-combobox-item>`
* Listbox: `<iktia-listbox>`, `<iktia-listbox-item>`

Implementation rules:

* Parent custom elements own behavior.
* Child custom elements provide value, disabled state, text, slot content, and
  metadata.
* Parents observe child changes through slots and mutation observers, then sync
  Zag collections.
* Public components do not expose Zag collection objects.

Acceptance criteria:

* Keyboard selection, roving focus, disabled items, and typeahead work where the
  component contract requires them.
* Dynamic item add/remove/update behavior is covered.
* Form participation is covered for selection components that submit values.

### M5: Core Overlays And Disclosure

Add overlay and disclosure primitives backed by Zag packages and their
transitive helpers.

Components:

* `<iktia-menu>`, `<iktia-menu-item>`
* `<iktia-context-menu>`
* `<iktia-dialog>`
* `<iktia-popover>`
* `<iktia-tooltip>`
* `<iktia-hover-card>`
* `<iktia-accordion>`, `<iktia-accordion-item>`
* `<iktia-collapsible>`

Implementation rules:

* Use Zag's own `dismissable`, `popper`, `focus-trap`, `remove-scroll`, and
  related transitive packages through the component packages.
* Do not add Floating UI separately in this milestone.
* Start with flat menu behavior before nested menu behavior.

Acceptance criteria:

* Escape, outside pointer, focus return, focus trap, scroll locking, and cleanup
  are covered in browser tests where applicable.
* Overlay positioning works in Shadow DOM.
* Disconnecting an open overlay leaves no document-level listeners behind.

### M6: Core Forms And Advanced Inputs

Add form and input primitives where Zag saves significant behavior work.

Components:

* `<iktia-switch>`
* `<iktia-number-input>`
* `<iktia-slider>`
* `<iktia-pin-input>`
* `<iktia-tags-input>`
* `<iktia-file-upload>`
* `<iktia-rating-group>`
* `<iktia-date-picker>`
* `<iktia-editable>`

Implementation rules:

* Use `formControl()` as the Iktia form bridge whenever a custom element
  represents a submitted value.
* Zag owns interaction behavior; Iktia owns native form integration.
* Native browser inputs remain preferred when styling and behavior requirements
  can be met without rebuilding the control.

Acceptance criteria:

* Submit, reset, disabled fieldset propagation, and `FormData` are covered for
  each form-associated custom control.
* Keyboard, pointer, and touch behavior are covered for slider, rating, date,
  and upload workflows.
* Validation behavior is documented as supported or explicitly experimental.

### M7: Feedback Components

Add feedback primitives after forms, overlays, and collections are stable.

Components:

* `<iktia-progress>`
* `<iktia-avatar>`
* `<iktia-toast>` plus a minimal toast root custom element.
* `<iktia-presence>` only if it becomes useful as an internal animation or
  mount/unmount primitive.

Acceptance criteria:

* Toast lifecycle and cleanup are covered.
* Progress and avatar expose stable parts, slots, ARIA, and CSS custom
  properties.
* Presence is internal unless a clear public use case exists.

### M8: Docs, Examples, And Stability Review

Deliverables:

* Add reference docs for every component family.
* Add example coverage for forms, collections, overlays, advanced inputs, and
  feedback.
* Document props, attributes, subcomponents, slots, parts, events, CSS custom
  properties, form behavior, keyboard behavior, and DSD behavior.
* Mark each component stable only after its tests and docs are complete.

Acceptance criteria:

* Users can install `@iktia/primitives`, import components, customize styling,
  and understand experimental limitations from docs alone.
* Browser tests pass in Chromium, Firefox, and WebKit.
* Workspace checks remain green.

## Deferred Components

These Zag-backed components are intentionally outside the Core Design System
roadmap until the main set is stable:

* angle slider
* carousel
* cascade select beta
* color picker
* drawer beta
* floating panel
* image cropper
* marquee
* QR code
* signature pad
* splitter
* steps
* timer
* tour
* tree view

They can become a later extended roadmap once the core adapter, compiler spread
support, and component families are proven in production-shaped tests.

## Test Strategy

Required checks for each implementation milestone:

```sh
cargo test -p iktia-core
pnpm --filter @iktia/primitives build
pnpm --filter @iktia/primitives check-types
pnpm --filter @iktia/primitives test
pnpm --filter @iktia/example-counter test
pnpm check-types
pnpm check:docs
pnpm check-release-set
git diff --check
```

Browser coverage must include:

* keyboard navigation and roving focus;
* form submission, reset, disabled fieldset propagation, and `FormData`;
* Escape and outside pointer dismissal;
* focus trapping and focus return;
* Shadow DOM scope behavior;
* dynamic collection changes;
* disconnect cleanup.

## Risks

* The Zag service layer could grow into a second component runtime. Keep it
  package-private, minimal, and tested against actual machine needs.
* JSX spread support could become too broad. Limit it to native elements until
  component spread semantics are explicitly designed.
* Collection subcomponents could drift from Zag's preferred collection shape.
  Keep parent-owned collection extraction small and test dynamic updates.
* Overlay behavior can be brittle across Shadow DOM and browsers. Ship overlay
  primitives experimentally until browser tests prove the contract.
* Runtime dependencies increase package surface area. Add only the Zag packages
  needed by shipped components and review transitive dependencies per milestone.
