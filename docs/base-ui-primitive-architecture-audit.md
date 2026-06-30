# Base UI Primitive Architecture Audit

Date: 2026-06-29
Status: Accepted audit for issue #77

## Summary

Base UI is a useful reference for Naos primitive architecture, but it is not a
dependency target and its React API surface is not an Naos API model. The
durable lessons are:

* anatomy-first primitive parts;
* stable styling hooks through state attributes and dynamic CSS variables;
* explicit composition escape hatches for trigger and item replacement;
* a shared overlay contract covering portal, positioner, popup, arrow,
  dismissal, focus, scroll lock, visual viewport, and teardown;
* a mount/unmount lifecycle for animated transient UI;
* form fields that combine native constraint validation, field state, error
  display, and server validation results;
* typed per-component contract docs.

Naos should translate those lessons into its existing Web Components-first
surface: custom elements, Shadow DOM, Light DOM slots, `part`, `data-*` state,
ARIA, CSS custom properties, `formControl()`, package-private behavior kernels,
and the `@naos-ui/primitives` package boundary. It should not add React, Base UI,
Radix, MUI, a virtual DOM, or a framework adapter runtime.

## Sources Reviewed

Primary Base UI sources:

* [Quick start](https://base-ui.com/react/overview/quick-start.md)
* [Styling](https://base-ui.com/react/handbook/styling.md)
* [Composition](https://base-ui.com/react/handbook/composition.md)
* [Animation](https://base-ui.com/react/handbook/animation.md)
* [Forms](https://base-ui.com/react/handbook/forms.md)
* [TypeScript](https://base-ui.com/react/handbook/typescript.md)
* [Base UI repository](https://github.com/mui/base-ui)

Local Naos sources:

* [RFC 0001: Naos Primitives Package](rfcs/0001-naos-primitives-package.md)
* [RFC 0002: Zag-Backed Primitives Roadmap](rfcs/0002-zag-backed-primitives-roadmap.md)
* [RFC 0006: Naos Router Package](rfcs/0006-naos-router-package.md)
* [ADR 0004: No Framework Runtime](adrs/0004-no-framework-runtime.md)
* [ADR 0008: Primitive Contracts With Parts, Slots, And Data State](adrs/0008-primitive-contracts-parts-slots-data-state.md)
* [ADR 0017: Theme Package And Token Boundary](adrs/0017-theme-package-and-token-boundary.md)
* [ADR 0018: Form-Associated Custom Element Support](adrs/0018-form-associated-custom-element-support.md)
* [`@naos-ui/primitives` README](../packages/primitives/README.md)

## Base UI Pattern Translation

| Base UI pattern | React-specific shape | Naos translation | Decision |
| --- | --- | --- | --- |
| One tree-shakable package with subpath imports | `@base-ui/react/popover` | Keep `@naos-ui/primitives` as one package with per-component subpath imports. | Adopt as package ergonomics. |
| Anatomy parts | `Root`, `Trigger`, `Portal`, `Positioner`, `Popup`, `Arrow`, `Item` | Custom elements and internal parts with stable slots, `part`, ARIA, and state attributes. | Adopt concept, not names wholesale. |
| Styling hooks | `className`, stateful `className` functions, stateful `style` functions, data attributes, CSS variables | Do not add React-style styling callbacks. Use `part`, `data-*`, ARIA, CSS custom properties, and theme tokens. | Adopt state/variable contract only. |
| Dynamic geometry variables | `--available-height`, `--anchor-width`, `--transform-origin`, popup dimensions | Publish `--naos-anchor-width`, `--naos-anchor-height`, `--naos-available-width`, `--naos-available-height`, `--naos-popup-width`, `--naos-popup-height`, and `--naos-transform-origin` where applicable. | Add to overlay docs/tests. |
| Render composition | `render={<MyButton />}` or render function that receives props/state | Prefer Light DOM triggers, named slots, child custom elements, and package-private context. Use issue #38 only for behavior attachment where a real host-node override is needed. | Do not copy React `render`. |
| Nested trigger composition | Tooltip trigger wrapping Dialog trigger wrapping Menu trigger | Define compound-trigger rules for tooltip/dialog/menu/popover when the same Light DOM node participates in multiple behaviors. | Needs conformance tests. |
| Portal setup | `Portal`, `Positioner`, app root `isolation: isolate`, iOS visual viewport note | Define Naos overlay root guidance and viewport/backdrop rules independent of React portals. | Add overlay architecture follow-up. |
| Animation lifecycle | `data-starting-style`, `data-ending-style`, `data-open`, `data-closed`, `keepMounted`, `actionsRef`, `getAnimations()` | Add a transient-ui lifecycle for entering, open, closing, and unmounted states. Prefer CSS transitions and use `Element.getAnimations()` for teardown when the primitive owns unmounting. | Feed #36 and #70. |
| Forms | Base UI field/form abstractions, native constraint validation, server errors, React Hook Form/TanStack integrations | Naos should use native `<form>`, `FormData`, `ElementInternals`, `formControl()`, `setValidity()`, field state, and router/action integration. | Feed #72 and #73. |
| Typed component contracts | part namespaces with `Props`, `State`, event detail types | Generate or maintain contract tables for attributes, properties, events, parts, slots, CSS variables, and form behavior. | Add docs metadata follow-up. |

## Component Coverage Matrix

The priority ranks architectural value for Naos, not user-facing popularity.

| Base UI component | Naos current status | Architectural value | Dependencies | Priority |
| --- | --- | --- | --- | --- |
| Accordion | `<naos-accordion>` / item exist, Zag-backed. | Disclosure, roving focus, nested state. | Context/request, keyboard tests. | P1 stabilize. |
| Alert Dialog | No dedicated component; `<naos-dialog>` exists. | Modal semantics, destructive action patterns. | Dialog overlay kernel, focus trap. | P2 after dialog contract. |
| Autocomplete | No separate primitive; `<naos-combobox>` exists. | Filtering, input/listbox coordination. | Combobox collection, form control. | P2 split only if UX differs. |
| Avatar | `<naos-avatar>` exists. | Feedback/loading state. | Image loading tests. | P3. |
| Button | `<naos-button>` exists. | Native baseline and event naming. | Native button semantics. | P1 stabilize. |
| Checkbox | `<naos-checkbox>` exists, form-associated MVP. | Native form contract. | Validation, labels, reset tests. | P1 stabilize. |
| Checkbox Group | Not present. | Multi-value form state. | Multi-value `formControl()` contract. | P2. |
| Collapsible | `<naos-collapsible>` exists. | Disclosure baseline. | ARIA and hidden-state tests. | P1 stabilize. |
| Combobox | `<naos-combobox>` / item exist. | Collection, typeahead, popup, form control. | Overlay, collection, form. | P1 stabilize. |
| Context Menu | `<naos-context-menu>` exists. | Pointer anchoring and menu behavior. | Overlay kernel, nested menus later. | P2. |
| Dialog | `<naos-dialog>` exists. | Modal stack, focus trap, inert policy. | Overlay kernel. | P1 stabilize. |
| Drawer | Not present. | Modal overlay plus visual-viewport/backdrop stress case. | Dialog kernel, animation lifecycle. | P2 after dialog. |
| Field | `<naos-field>` exists. | Label, hint, status, error structure. | Form state docs. | P1 stabilize. |
| Fieldset | No dedicated custom element. | Group labels and disabled propagation. | Native fieldset mapping. | P2. |
| Form | No primitive form wrapper. | Submission status, server errors, action bridge. | #72, #73, router actions. | P1 design. |
| Input | No dedicated `<naos-input>` in package despite RFC candidate. | Native entry baseline, labels, validation. | `formControl()` or slotted input policy. | P1 add or document non-goal. |
| Menu | `<naos-menu>` / item exist. | Roving focus, typeahead, dismiss, selection. | Overlay kernel. | P1 stabilize. |
| Menubar | Not present. | Horizontal menu and nested composite focus. | Menu stabilization. | P3. |
| Meter | Not present. | Low-risk feedback semantics. | Native meter comparison. | P3. |
| Navigation Menu | Not present. | Composite links and disclosure navigation. | Menu/popover/link composition. | P3. |
| Number Field | `<naos-number-input>` exists. | Custom input, steppers, validation. | Form control, keyboard tests. | P1 stabilize. |
| OTP Field | `<naos-pin-input>` exists as equivalent. | Multi-cell input and paste behavior. | Form control, focus management. | P2. |
| Popover | `<naos-popover>` exists. | Non-modal overlay kernel. | Positioner, outside dismiss, animation. | P1 stabilize. |
| Preview Card | `<naos-hover-card>` exists as equivalent. | Hover/focus preview and delay groups. | Overlay kernel. | P2. |
| Progress | `<naos-progress>` exists. | Feedback ARIA baseline. | Value semantics. | P3. |
| Radio | `<naos-radio-group>` / radio exist. | Single-value form collection. | Form control, roving focus. | P1 stabilize. |
| Scroll Area | Not present. | Styling and scroll affordances. | Native scrollbar policy. | P3 reference only. |
| Select | `<naos-select>` / item exist. | Collection, popup, typeahead, form. | Overlay, collection, form. | P1 stabilize. |
| Separator | Not present. | Low-risk structural primitive. | ARIA orientation. | P3. |
| Slider | `<naos-slider>` exists. | Pointer/keyboard/input value bridge. | Form control, touch tests. | P1 stabilize. |
| Switch | `<naos-switch>` exists. | Boolean form control. | Label and validation policy. | P1 stabilize. |
| Tabs | `<naos-tabs>` / tab / panel exist. | Roving focus and panel linkage. | Context, keyboard tests. | P1 stabilize. |
| Toast | `<naos-toast>` / root exist. | Transient lifecycle and stacked layout. | Animation lifecycle, live region docs. | P2. |
| Toggle | `<naos-toggle>` exists. | Pressed state and form value bridge. | Form control. | P2. |
| Toggle Group | `<naos-toggle-group>` / item exist. | Single/multiple collection value. | Multi-value form contract. | P2. |
| Toolbar | Not present. | Composite focus grouping. | Roving focus kernel. | P3. |
| Tooltip | `<naos-tooltip>` exists. | Non-interactive overlay and trigger composition. | Overlay kernel, compound triggers. | P1 stabilize. |

Naos also has primitives that Base UI does not frame the same way: date picker,
editable, file upload, listbox, rating group, segmented control, and tags input.
Those should stay in the Zag-backed roadmap and use the same audit conclusions:
stable DOM contracts first, package-private behavior second, docs/tests before
stability.

## Overlay Architecture

Base UI's overlay architecture is the highest-value reference area for Naos.
Naos already has overlay primitives, but they need one shared contract instead
of per-component accidental behavior.

The Naos overlay contract should define:

* **Portal target**: where floating content is moved or rendered, how the target
  is selected, and how Shadow DOM ownership is preserved.
* **Root stacking context**: document that app roots using overlays should form
  a predictable stacking context, equivalent in intent to Base UI's root
  isolation guidance.
* **Layer stack**: modal and non-modal ordering, nested overlay ownership,
  Escape routing, outside press routing, and cleanup on disconnect.
* **Positioner**: anchor lookup, side, align, collision, available size,
  transform origin, and hidden-anchor state.
* **Popup**: public state attributes, parts, CSS variables, DSD behavior, and
  animation lifecycle state.
* **Arrow**: side-aware positioning and part/variable contract.
* **Dismissal**: outside pointer, focus outside, Escape, close trigger, and
  programmatic close behavior.
* **Focus**: initial focus, focus trap for modal overlays, focus return,
  non-modal focus escape, Shadow DOM active element handling.
* **Background interaction**: inert, aria-hidden, pointer blocking, and scroll
  lock policy.
* **Visual viewport**: backdrop and viewport rules for mobile Safari and page
  chrome changes.
* **Teardown**: all document listeners, observers, animation listeners, and
  scroll locks must be removed on close and disconnect.

Recommended public names for dynamic overlay variables:

| Variable | Meaning |
| --- | --- |
| `--naos-anchor-width` | Anchor border-box width. |
| `--naos-anchor-height` | Anchor border-box height. |
| `--naos-available-width` | Available collision-aware width. |
| `--naos-available-height` | Available collision-aware height. |
| `--naos-popup-width` | Resolved popup width, when measured. |
| `--naos-popup-height` | Resolved popup height, when measured. |
| `--naos-positioner-width` | Positioner width, when the positioner is a distinct part. |
| `--naos-positioner-height` | Positioner height, when the positioner is a distinct part. |
| `--naos-transform-origin` | Transform origin for scale/opacity transitions. |

Recommended public state attributes:

| Attribute | Meaning |
| --- | --- |
| `data-state="open|closed"` | Stable open state. |
| `data-side="top|right|bottom|left|none"` | Resolved popup side. |
| `data-align="start|center|end"` | Resolved popup alignment. |
| `data-anchor-hidden` | Anchor is clipped or hidden. |
| `data-collision-padding` | Optional debug/test hook for collision config. |
| `data-starting-style` | Enter transition starting style. |
| `data-ending-style` | Exit transition ending style. |

Follow-up: issue #35 should own the shared portal/overlay kernel, including
root stacking guidance and visual-viewport policy.

## Animation Lifecycle

`data-state="open|closed"` is insufficient for polished transient UI because a
component can be logically closed while still mounted for exit animation. Naos
should define a lifecycle that every overlay and toast-like primitive can share:

| Phase | Mounted | Suggested public hook | Meaning |
| --- | --- | --- | --- |
| `entering` | Yes | `data-starting-style` plus `data-state="open"` | Element just mounted and can transition from initial styles. |
| `open` | Yes | `data-state="open"` | Element is fully open. |
| `closing` | Yes | `data-ending-style` plus `data-state="closed"` | Element is logically closed but waiting for transition/animation completion. |
| `closed` | Optional | `data-state="closed"` | Element is kept mounted by user or primitive policy. |
| `unmounted` | No | None | Element has been removed after teardown. |

Naos should prefer CSS transitions for cancellable state changes. When a
primitive owns unmounting, it should wait for `Element.getAnimations()` on the
popup/root nodes before removing DOM, with a timeout or abort path so teardown
cannot hang. A public `keepMounted`-equivalent can be considered, but it should
be named and typed as an Naos property, not copied from Base UI by default.

Follow-up: issue #36 should own the generic transient lifecycle and animation
teardown rules. Issue #70 should reuse the same lifecycle for router view
transitions instead of creating a parallel mount model.

## Forms Architecture

Base UI's forms work confirms that forms should be platform infrastructure, not
a component-library afterthought. Naos has the stronger native path because it
targets Custom Elements and already has ADR 0018 plus `formControl()`.

Naos form primitives should converge on this contract:

* native `<form>` submission and `FormData` remain the source of truth;
* custom controls use Form-Associated Custom Elements when they submit values;
* `name`, `value`, `disabled`, reset, disabled fieldset propagation, and
  validation are documented per primitive;
* labels and descriptions use native labels, `ElementInternals.labels`,
  slots, and `aria-describedby`;
* state attributes cover `data-invalid`, `data-valid`, `data-pending`,
  `data-touched`, `data-dirty`, and `data-submitting` only where the primitive
  or form scope can prove the state;
* field errors have a DOM and ARIA contract, not only event payloads;
* server-side errors can be merged into field state and cleared on value
  changes through the actions/forms layer;
* React Hook Form and TanStack Form adapters stay out of core.

The split should be:

| Owner | Responsibility |
| --- | --- |
| `@naos-ui/primitives` | Field shells, form-associated controls, parts, slots, ARIA, state attributes, primitive events. |
| `@naos-ui/router` / actions package | Submission orchestration, action result mapping, pending state, server validation payloads. |
| `@naos-ui/runtime` | Only tiny generated-code helpers already allowed by ADR 0004/0013. |
| App code | Persistence, schema validation, business rules, and server transport. |

Follow-up: issue #73 should expand from form status to field-state semantics,
server-error merge/clear behavior, and validation display contracts. Issue #72
should define how reusable action primitives return field errors that controls
and fields can consume without coupling forms to the router.

## Composition Architecture

Base UI's `render` prop solves two real problems: replacing the underlying DOM
node and allowing several behaviors to share one trigger. Naos needs those
capabilities, but the React mechanism does not translate directly.

Naos should use these composition layers, in order:

1. Prefer native Light DOM ownership for author-provided triggers, labels, and
   links.
2. Prefer named slots when a primitive needs stable placement but not behavior
   transfer.
3. Prefer child custom elements for items and compound parts that need metadata
   or behavior registration.
4. Use package-private `context-request` for parent/child registration.
5. Use the #38 behavior-attachment direction only when a behavior must attach
   props/listeners/ARIA to an author-owned DOM node.

Compound-trigger conformance cases should include:

* tooltip trigger plus dialog trigger on the same button;
* menu trigger plus tooltip trigger on the same button;
* menu item rendered as a real link;
* popover trigger inside a form without stealing submit behavior;
* disabled trigger behavior across stacked primitives;
* focus return when one trigger opens and closes nested overlays.

Follow-up: issue #38 should use this audit as the problem statement for
behavior attachment. It should not grow into Svelte-style directive syntax or a
React-style prop-spread API unless the existing `use={[...]}` direction cannot
support compound triggers.

## Typed Contract Documentation

Base UI exposes part-level props, state, and event detail types. Naos should
not mirror React namespaces, but it should make every primitive contract
machine-checkable enough that docs, tests, and TypeScript types do not drift.

Each primitive family should document:

* custom element tags and subpath imports;
* properties and reflected attributes;
* slots and `part` names;
* state attributes and their values;
* CSS custom properties;
* event names and `detail` payloads;
* form participation and validation behavior;
* keyboard, pointer, and focus behavior;
* DSD/pre-upgrade behavior;
* stability level and known experimental gaps.

Recommended follow-up: define a small source metadata format in
`@naos-ui/primitives` and generate reference tables for docs. This can start as a
plain TypeScript object per primitive family before any build-time generator is
introduced.

## Concrete Follow-Up Changes

These changes are concrete enough to become issue updates or implementation
tasks:

1. Add a shared overlay contract document or RFC section for portal target,
   layer stack, focus, dismiss, scroll lock, visual viewport, positioner,
   popup, arrow, and cleanup.
2. Add public overlay CSS variable names with the `--naos-*` prefix and tests
   that assert they update for popover, select, menu, tooltip, and dialog.
3. Add a transient UI lifecycle helper/protocol for entering, open, closing,
   closed, and unmounted states using `data-starting-style`,
   `data-ending-style`, and `Element.getAnimations()` teardown.
4. Extend forms work with field-state semantics for invalid, valid, pending,
   touched, dirty, submitting, server errors, and clear-on-change behavior.
5. Define compound-trigger composition conformance tests for tooltip, dialog,
   menu, popover, links, and disabled triggers.
6. Decide whether `<naos-input>`, checkbox group, fieldset, form, drawer,
   separator, and toolbar belong in the core roadmap or should be explicitly
   deferred.
7. Add per-primitive contract metadata and generated docs tables for
   attributes, properties, events, parts, slots, CSS variables, and form
   behavior.
8. Update `@naos-ui/primitives` stabilization criteria so a primitive cannot move
   out of experimental status until its contract table, keyboard behavior,
   form behavior, Shadow DOM behavior, and cleanup tests are present.

## Related Issue Updates

The audit changes the scope of related issues as follows:

| Issue | Update |
| --- | --- |
| #35 | Treat as the owner for the shared portal/overlay kernel and root stacking/visual viewport guidance, not only a compile-time style-delivery feature. |
| #36 | Treat as the owner for transient UI lifecycle, `data-starting-style`, `data-ending-style`, cancellable CSS transitions, and `getAnimations()` teardown. |
| #38 | Use Base UI composition as reference evidence for compound triggers and host-node behavior attachment, while preserving Naos's `use={[...]}` direction. |
| #70 | Reuse the same transient lifecycle for view transitions and link prefetch UX instead of a separate router-only mount model. |
| #72 | Return reusable action/server-validation results in a shape that fields can consume without coupling primitives to router internals. |
| #73 | Expand form status into field-state semantics, server-error merge/clear behavior, label/error ARIA wiring, and FACE validation docs. |

## Acceptance Check

This audit satisfies issue #77 by:

* stating that Base UI is a reference only and adding no Base UI runtime
  dependency;
* separating React-specific API shape from durable primitive architecture
  lessons;
* linking the Base UI docs pages reviewed;
* identifying more than five concrete Naos follow-up changes;
* covering styling, composition, forms, animation, overlays, and component
  coverage;
* aligning with ADR 0004, ADR 0008, RFC 0001, RFC 0002, RFC 0006, ADR 0017,
  and ADR 0018.
