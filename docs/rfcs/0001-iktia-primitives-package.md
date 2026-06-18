# RFC 0001: Iktia Primitives Package

Status: Draft
Date: 2026-06-17
Updated: 2026-06-18

## Summary

Add a separate `@iktia/primitives` package for core UI primitives authored in
Iktia and shipped as native Web Components.

The package should cover the controls that product interfaces usually need
before a design system can be useful: actions, fields, checkboxes, toggles,
tabs, disclosure controls, dropdowns, and related composition helpers. The
package is not a port of Web Awesome, Base UI, or any other library. Those
projects are useful references for primitive coverage and interaction
expectations, but Iktia primitives must use Iktia's own authoring model,
compiler constraints, and platform-native output.

This RFC defines the first component taxonomy, public DOM contracts, package
shape, milestone plan, and acceptance criteria.

## Goals

* Ship a real public package named `@iktia/primitives`.
* Provide a small but useful baseline of accessible Web Component primitives.
* Exercise Iktia's compiler with production-shaped components before a larger
  design system exists.
* Keep primitives styleable through platform contracts: slots, `part`,
  attributes, `data-*` state, ARIA, and CSS custom properties.
* Prefer native browser behavior whenever it satisfies the primitive contract.
* Extract complex interaction behavior into small, testable behavior kernels
  inside the primitives package.
* Keep the package independent from React, Lit, Base UI, Web Awesome, Radix,
  CSS-in-JS, and framework adapter runtimes.
* Identify compiler, runtime, and authoring gaps through real primitive needs.

## Non-Goals

* Do not copy source code, CSS, DOM structure, naming, or visual styling from
  Web Awesome, Base UI, or any third-party primitive library.
* Do not create a full opinionated design system theme.
* Do not add a virtual DOM, reconciler, hook runtime, or framework
  compatibility layer.
* Do not move primitive-specific behavior into `@iktia/runtime`.
* Do not make advanced overlay positioning a prerequisite for the first package
  milestone.
* Do not hide native platform semantics behind Iktia-specific abstractions when
  slots, attributes, properties, forms, ARIA, or browser APIs are enough.

## Existing Constraints

This package must follow the accepted Iktia architecture:

* Generated output is platform-native Custom Elements.
* The browser platform is the public runtime contract.
* Runtime behavior remains small platform helper behavior, not a component
  runtime.
* Component source uses exported PascalCase functions and the v0.1 public
  authoring API.
* CSS uses Vite `?inline` text imports and flat `ComponentOptions.styles`.
* Theming uses CSS custom properties.
* Public primitive styling contracts use `part`, slots, `data-state`,
  `data-disabled`, `data-invalid`, `data-orientation`, and ARIA.
* Declarative Shadow DOM is an explicit prerender/static HTML path, not a
  component authoring option.

Design note: a future CSS authoring pass may replace or complement
`options.styles` with an export shape such as `export const styles = [css]`.
That is intentionally out of scope for this stabilization pass; the current
package keeps the existing `ComponentOptions.styles` contract.

## Package Shape

The new public package is `@iktia/primitives`.

Component exports use branded PascalCase names so the generated Custom Element
tags are stable and clearly owned by Iktia:

| Export | Custom Element | Stability At Introduction |
| --- | --- | --- |
| `IktiaButton` | `<iktia-button>` | Experimental |
| `IktiaButtonGroup` | `<iktia-button-group>` | Experimental |
| `IktiaField` | `<iktia-field>` | Experimental |
| `IktiaInput` | `<iktia-input>` | Experimental |
| `IktiaTextarea` | `<iktia-textarea>` | Experimental |
| `IktiaCheckbox` | `<iktia-checkbox>` | Experimental |
| `IktiaToggle` | `<iktia-toggle>` | Experimental |
| `IktiaRadioGroup` | `<iktia-radio-group>` | Experimental |
| `IktiaRadio` | `<iktia-radio>` | Experimental |
| `IktiaTabs` | `<iktia-tabs>` | Experimental |
| `IktiaTabList` | `<iktia-tab-list>` | Experimental |
| `IktiaTab` | `<iktia-tab>` | Experimental |
| `IktiaTabPanel` | `<iktia-tab-panel>` | Experimental |
| `IktiaDisclosure` | `<iktia-disclosure>` | Experimental |
| `IktiaAccordion` | `<iktia-accordion>` | Experimental |
| `IktiaDropdown` | `<iktia-dropdown>` | Experimental |
| `IktiaMenu` | `<iktia-menu>` | Experimental |
| `IktiaMenuItem` | `<iktia-menu-item>` | Experimental |
| `IktiaPopover` | `<iktia-popover>` | Later candidate |
| `IktiaTooltip` | `<iktia-tooltip>` | Later candidate |
| `IktiaDialog` | `<iktia-dialog>` | Later candidate |

The package should allow top-level imports for convenience and per-component
subpath imports when the package build supports them:

```ts
import "@iktia/primitives/button"
import { IktiaButton } from "@iktia/primitives"
```

The implementation should keep each primitive in its own `.wc.tsx` module with
adjacent `?inline` CSS. Shared TypeScript-only types are allowed for common
values such as orientation, disabled state, invalid state, size, and visual
variant. Shared runtime state machines are allowed only when they are plain
platform helpers and do not become a component runtime.

Primitive behavior kernels should live under package-internal modules such as
`@iktia/primitives/internal/behavior/*` during the experimental phase. Public
behavior-only exports require a later RFC or explicit stability review.

Before implementing those kernels from scratch, evaluate mature open-source
behavior libraries and decide per primitive whether to adapt, depend on,
clean-room port, or only use them as conformance references.

## Platform-First Behavior

Iktia primitives should follow the Remix v3-inspired "use the platform" rule:
if a browser primitive provides the required behavior, accessibility, form
semantics, focus behavior, and styling hooks, use it instead of rebuilding the
behavior in Iktia.

Platform-first choices are the default for:

* actions: native `<button>`;
* text entry: native `<input>` and `<textarea>`;
* labels and descriptions: native `<label>`, `aria-describedby`, and slots;
* basic disclosure baseline: native `<details>` when it satisfies state and
  styling requirements;
* dialogs: native `<dialog>` when modal behavior, focus, and styling needs fit;
* floating surfaces: native Popover API when anchoring, dismiss behavior, focus,
  and browser support fit;
* forms: native form controls or Form-Associated Custom Elements instead of
  hand-rolled form serialization.

Custom behavior kernels are justified only when the platform primitive cannot
meet the documented primitive contract. Common reasons include roving focus,
typeahead, nested menu behavior, controlled/uncontrolled state coordination,
state reflection across multiple slotted parts, cross-Shadow-DOM overlay
coordination, or design-system composition that native elements cannot express.

Native-first does not mean native-only. Rebuilding a browser-provided control is
acceptable when native styling, composition, accessibility hooks, or behavior
are not good enough for a design-system primitive. This is most likely for auto
suggest, combobox, date picker, custom select, segmented controls, toggle button
groups, and other controls where browser UI is inconsistent, insufficiently
styleable, or missing required interaction states.

When rebuilding a native-adjacent control, the replacement must explicitly
document why the browser primitive was insufficient and must preserve the native
contract users expect: keyboard behavior, form behavior, labels, validation,
focus, accessibility roles, and progressive enhancement where practical.

When a kernel wraps native behavior, it should preserve platform events and
semantics instead of replacing them with synthetic abstractions. Iktia-specific
events should report primitive-level state changes; they should not hide native
input, click, keyboard, pointer, or focus events from consumers.

Form primitives have an additional platform-first rule: if a component presents
itself as a form control, it must work with the real `<form>` element. Native
internal controls are acceptable for experimental primitives, but stable custom
form controls must either expose a slotted native form control or participate as
Form-Associated Custom Elements. Styling a Shadow DOM `<input>` is not enough if
the ancestor form cannot submit, reset, disable, label, or validate it.

## Public Primitive Contract

Every primitive must document:

* props and reflected attributes;
* slots;
* `part` names;
* events;
* state attributes;
* CSS custom properties;
* keyboard behavior;
* form behavior when applicable;
* Declarative Shadow DOM behavior.

Shared DOM conventions:

* `data-state`: primary state such as `checked`, `unchecked`, `on`, `off`,
  `open`, `closed`, `active`, `inactive`, `selected`, or `unselected`.
* `data-disabled`: present when the primitive is disabled.
* `data-invalid`: present when the primitive is invalid.
* `data-orientation`: `horizontal` or `vertical` for oriented components.
* `part="root"`: the root internal element or main style hook.
* `part="control"`: the interactive control when distinct from the root.
* `part="label"`: visible label content.
* `part="indicator"`: checkmark, toggle knob, selected marker, disclosure icon,
  or equivalent state indicator.
* `part="panel"`: tab, accordion, disclosure, or overlay content region.

Component-specific parts may extend this list, but they must be stable once a
component is marked stable.

Events use an Iktia-prefixed convention:

| Event | Purpose |
| --- | --- |
| `iktia-change` | A component value or checked/pressed/selected state changed. |
| `iktia-open-change` | An open/closed state changed. |
| `iktia-select` | A menu or list item was selected. |
| `iktia-input` | Text input changed while editing. |
| `iktia-invalid` | Validation state changed or validation failed. |

Components should use these generic event names unless a future RFC defines a
component-specific exception. Event `detail` payloads must be typed and
documented per component.

### Event And Input Handling

Iktia has two different event concepts:

* `event()` creates typed `CustomEvent` emitters for component-level events.
* `on()` attaches typed native DOM listeners in source and lowers to normal
  platform event handling in generated output.

Primitives should keep using `on()` for local DOM listeners because it gives
TypeScript event types, listener options, and compiler-readable intent without
introducing a synthetic event system. `on()` is not a React-style event layer
and should not normalize browser events globally.

Behavior kernels may normalize input only at the primitive boundary. Allowed
normalization:

* map keyboard commands such as Arrow keys, Home/End, Enter, Space, and Escape
  to primitive actions;
* handle pointer and touch through Pointer Events when possible;
* avoid duplicate activation when keyboard, pointer, and click events overlap;
* distinguish focus-visible, focus movement, selection, press, open, and dismiss
  intent when the primitive requires it;
* centralize cleanup through `AbortSignal`.

Disallowed normalization:

* a global synthetic event system;
* replacing native `click`, `input`, `change`, `keydown`, `pointerdown`, focus,
  or blur semantics for all primitives;
* touch-only code paths when Pointer Events and native activation behavior are
  sufficient;
* hiding native events from host applications.

The default input strategy is:

* simple controls use native activation and listen to `click`, `input`, or
  `change`;
* composite widgets use `keydown` for keyboard navigation and native focus
  events for focus state;
* press-like custom controls use Pointer Events plus native `click` as the
  activation boundary;
* overlays use platform focus events, Escape handling, outside pointer/click
  handling, and `AbortSignal` cleanup.

## Native Form Contract

Form primitives should behave like native form controls when used inside a real
`<form>`. A primitive that cannot meet this bar must remain experimental and
document the limitation.

Stable form primitives must support the relevant parts of the native form
contract:

* `name`, `value`, `disabled`, `required`, `readonly`, `checked`,
  `indeterminate`, `multiple`, `min`, `max`, `step`, `pattern`, `minlength`,
  `maxlength`, and `autocomplete` where those concepts apply;
* contribution to `new FormData(form)` and browser submission;
* `form.reset()` and reset-button behavior;
* disabled propagation from ancestor `<fieldset disabled>`;
* constraint validation through `checkValidity()`, `reportValidity()`,
  `validationMessage`, `validity`, and invalid events where applicable;
* label association through native `<label>`, accessible names, and
  `ElementInternals.labels` when using Form-Associated Custom Elements;
* participation in submit events without bypassing native validation;
* progressive enhancement where non-JavaScript or pre-upgrade markup remains
  meaningful when practical.

Implementation policy:

* Prefer slotted native light-DOM controls for early form-heavy primitives when
  Shadow DOM form participation is not yet implemented.
* Prefer Form-Associated Custom Elements with `ElementInternals` for stable
  custom controls that render their own internal control.
* Use `setFormValue()` for submission values, `setValidity()` for validation,
  `formResetCallback()` for reset, and `formDisabledCallback()` for disabled
  propagation.
* Do not emulate form submission with custom events as the stable behavior.
  Custom events can notify state changes, but the `<form>` owns submission.
* Do not mark a custom checkbox, radio, select, switch, or text-entry primitive
  stable until form participation is covered by browser tests.

Browser tests for form primitives must cover:

* form submission and `FormData` output;
* reset from `form.reset()` and `<button type="reset">`;
* submit button activation and `form.requestSubmit()`;
* native validation blocking submit;
* disabled fieldset propagation;
* label click/focus behavior;
* pre-upgrade and DSD-rendered markup where the primitive supports static HTML.

## Behavior Architecture

Complex primitives should split rendered Web Components from interaction
behavior. Downshift is the useful inspiration: keep stateful accessibility and
interaction logic separate from visual structure. Iktia should not copy
Downshift's React hook or getter-prop API, because Iktia components compile to
native Custom Elements instead of rendering through React.

The Iktia translation is a behavior kernel:

```ts
const behavior = createSelectBehavior({
  disabled,
  itemToString,
  items,
  value,
  onChange,
})

behavior.connect({
  host,
  trigger,
  listbox,
  items,
})
```

Behavior kernels are plain TypeScript modules that own interaction semantics
for a primitive family. They may manage state transitions, keyboard handling,
ARIA attributes, focus movement, typeahead, selection, open/close behavior,
outside-click behavior, and cleanup. They must not render DOM, own CSS, create
Shadow DOM, depend on JSX, or require a framework runtime.

Primitive `.wc.tsx` components remain responsible for DOM shape, slots, parts,
CSS custom properties, default styles, and Custom Element integration. They
instantiate the relevant behavior kernel and connect it to concrete DOM nodes.

Behavior kernels belong in `@iktia/primitives`, not `@iktia/runtime`.
`@iktia/runtime` remains limited to generated-code platform helpers. Tabs,
menus, selects, comboboxes, radio groups, and disclosure behavior are component
semantics, so they must stay with the primitives package.

Recommended behavior kernels:

| Kernel | Used By | Responsibilities |
| --- | --- | --- |
| `createRovingFocusBehavior` | Tabs, radio group, menu | Arrow key movement, disabled item skipping, orientation. |
| `createDisclosureBehavior` | Disclosure, accordion, dropdown | Open/closed state, trigger attributes, Escape handling where applicable. |
| `createSelectionBehavior` | Radio group, tabs, select | Single selection, controlled/uncontrolled state, change events. |
| `createTypeaheadBehavior` | Menu, select, combobox | Character search and highlighted item movement. |
| `createOverlayBehavior` | Dropdown, popover, tooltip, dialog | Outside click, focus return, light-dismiss, platform API integration. |

Simple primitives should not force this split. Button, field, input, and
textarea can stay mostly component-local unless shared behavior emerges.
Checkbox and toggle can start component-local or use a small selection/toggle
kernel if tests show reuse value.

Behavior kernels should expose deterministic transition functions where
possible and DOM connection adapters only where real DOM is required. This lets
most logic be covered by fast unit tests, while browser tests focus on DOM,
focus, form, and hydration behavior.

## Behavior Source Evaluation

Iktia should avoid inventing complex behavior where mature prior art exists.
Before M2-M5 implementation starts, write a behavior-source evaluation for each
complex primitive family. This is a required design artifact, not a research
side quest. The output should be committed next to the primitive implementation
or linked from the package README while the primitive is experimental.

Each evaluation must end with one of four decisions:

* **Depend**: import a small framework-agnostic package directly.
* **Adapt**: wrap a framework-agnostic package behind Iktia's behavior-kernel
  interface.
* **Clean-room port**: reimplement the behavior from observed public behavior,
  specs, docs, and tests without copying source structure.
* **Reference only**: use the source for taxonomy, edge cases, docs, or tests,
  but write Iktia behavior independently.

### Required Evaluation Template

Each primitive-family evaluation should include:

* **Primitive family**: for example tabs, radio group, menu, select, combobox,
  disclosure, dialog, tooltip, or form controls.
* **Behavior scope**: state transitions, keyboard model, focus model, ARIA,
  typeahead, validation, form participation, overlay positioning, dismiss
  behavior, and cleanup.
* **Candidate sources**: libraries, WAI-ARIA examples, browser APIs, and Web
  Component implementations reviewed.
* **License and attribution**: license, copyright attribution requirements,
  NOTICE requirements, and whether the license is acceptable for Apache-2.0
  npm distribution.
* **Architecture fit**: whether the source is framework-agnostic, React/Vue/
  Solid-specific, DOM-specific, state-machine-based, or tied to a renderer.
* **Shadow DOM fit**: whether event delegation, focus management, IDs,
  `aria-controls`, portals, overlays, and outside-click behavior work across
  Shadow DOM boundaries.
* **Runtime-boundary fit**: whether reuse would keep primitive semantics inside
  `@iktia/primitives` and avoid growing `@iktia/runtime`.
* **Bundle and dependency cost**: package size, transitive dependencies,
  tree-shaking behavior, and whether importing one primitive pulls unrelated
  behavior.
* **Test leverage**: upstream tests, docs examples, WAI-ARIA examples, and
  conformance cases that can be adapted.
* **Maintenance risk**: upstream stability, API churn, release cadence,
  dependency security posture, and cost of staying compatible.
* **Decision**: depend, adapt, clean-room port, or reference only.
* **Rationale**: why this path is better than writing the behavior from scratch.

### Scoring Rubric

Use a simple 0-2 score for each candidate and primitive family:

| Criterion | 0 | 1 | 2 |
| --- | --- | --- | --- |
| License fit | Unknown or incompatible | Compatible with review needed | Clearly compatible and documented |
| Framework independence | Renderer-bound | Mostly separable | Framework-agnostic |
| Shadow DOM fit | Assumes light DOM/global React tree | Needs adapters | Works with Custom Elements/Shadow DOM |
| Runtime-boundary fit | Requires component runtime | Requires careful wrapping | Plain helper/state-machine behavior |
| Behavior maturity | Sparse docs/tests | Some real use and tests | Broad real use, docs, and edge-case coverage |
| Test leverage | Little reusable behavior evidence | Examples can become tests | Upstream tests/docs map cleanly to conformance |
| Dependency cost | Large or broad transitive graph | Acceptable with tree-shaking | Small, focused, tree-shakable |
| API lock-in risk | Would leak upstream API | Can be hidden with effort | Naturally hidden behind Iktia kernels |

Default thresholds:

* A direct dependency requires no `0` scores and at least `12` total points.
* An adaptation requires no license `0`, no runtime-boundary `0`, and at least
  `10` total points.
* A clean-room port is preferred when behavior maturity is high but framework
  independence, Shadow DOM fit, or API lock-in risk is weak.
* Reference-only use is preferred when the source is useful for edge cases but
  not a strong implementation fit.

### Initial Candidate Matrix

| Source | Best Use | Likely Path | Main Risk |
| --- | --- | --- | --- |
| [Zag.js](https://zagjs.com/overview/introduction) | State-machine behavior for tabs, menu, select, combobox, radio group, dialog, tooltip, and similar complex primitives. | Adapt or clean-room port. Start here for complex state machines. | Machine APIs and package boundaries may not map cleanly to Iktia's Custom Element wrappers. |
| [Floating UI](https://floating-ui.com/docs/getting-started) | Overlay positioning, collision handling, anchoring, and possibly dismiss/focus patterns around dropdowns, popovers, tooltips, and dialogs. | Depend or adapt for positioning. Treat interactions separately. | Some interaction helpers are framework-package-specific; positioning should not drag in renderer assumptions. |
| [Downshift](https://www.downshift-js.com/) | Select and combobox interaction model, getter-prop ergonomics, ARIA behavior, controlled/uncontrolled state ideas. | Reference or clean-room port for select/combobox behavior. | React hook/getter-prop API does not map directly to Iktia components. |
| [React Aria / React Stately](https://react-aria.adobe.com/) | Accessibility behavior, internationalization, collection handling, selection, overlay, and hard edge cases. | Reference or clean-room port. | React APIs and collection abstractions may be too large or renderer-bound. |
| [Radix UI](https://www.radix-ui.com/primitives/docs/overview/introduction) / [Ariakit](https://ariakit.com/) | ARIA behavior, keyboard interaction, focus management, and component taxonomy. | Reference. | React component systems are unlikely to be direct implementation sources. |
| [Web Awesome](https://webawesome.com/docs/) / [Shoelace](https://shoelace.style/) | Web Component DOM contracts, parts, custom states, form-control integration patterns, and real user-facing component behavior. | Reference; possible clean-room port for Web Component-specific edge cases after license review. | Behavior may be coupled to Lit/component internals and visual DOM shape. |
| [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) | Normative-ish interaction examples and keyboard expectations. | Conformance reference for every accessible composite primitive. | Examples are not complete production components. |
| Native browser APIs | `<button>`, `<input>`, `<textarea>`, `<details>`, Popover API, `<dialog>`, form controls. | Prefer native behavior when it satisfies the primitive contract. | Native behavior may be inconsistent across browsers or too limited for design-system composition. |

### Preliminary Evaluation

This pass was performed on 2026-06-17 from public docs and repository license
files. It is enough to guide the first implementation plan, but every direct
dependency or source-derived port still needs a final license and package-size
check when the package is added.

Verified source facts:

* Zag describes itself as framework-agnostic, state-machine-powered, accessible,
  headless, and incrementally adoptable with individual component machine
  packages. The repository license is MIT.
* Floating UI provides vanilla DOM packages such as `@floating-ui/dom`, is
  modular/tree-shakeable, and separates positioning from React-specific
  interaction hooks. The repository license is MIT.
* Downshift targets WAI-ARIA-compliant React autocomplete/combobox/select
  components and recommends React hooks as the primary API. The repository
  license is MIT.
* React Aria provides many accessible React components with built-in behavior,
  adaptive interactions, accessibility, internationalization, and style-free
  output. The repository license is Apache-2.0.
* Radix Primitives is a low-level React UI component library focused on
  accessibility and customization; it ships unstyled components and handles
  focus management and keyboard navigation internally. The repository license is
  MIT.
* Ariakit presents itself as an open-source React library with unstyled,
  primitive accessible components and example implementations. Its license must
  still be verified during a dependency review.
* Web Awesome and Shoelace are Web Component libraries with relevant component
  coverage and Web Component DOM/styling contracts. Public repository licenses
  are permissive, but Web Awesome also has Core/Pro product boundaries that must
  be checked before deriving behavior or tests.

Provisional scores:

| Source | License | Framework | Shadow DOM | Runtime | Maturity | Tests | Cost | API Risk | Total | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Zag.js | 2 | 2 | 1 | 2 | 2 | 1 | 1 | 1 | 12 | Primary behavior candidate. Run an M1 spike against tabs and radio group. Prefer adapt first; clean-room port if machine APIs leak too much. |
| Floating UI DOM/Core | 2 | 2 | 1 | 2 | 2 | 1 | 2 | 2 | 14 | Best direct dependency candidate for overlay positioning only. Do not import React interaction packages. |
| Downshift | 2 | 0 | 0 | 1 | 2 | 2 | 1 | 0 | 8 | Reference only for select/combobox state, ARIA, and tests. Clean-room port ideas; do not depend. |
| React Aria/Stately | 2 | 0 | 0 | 1 | 2 | 2 | 0 | 0 | 7 | Reference only for accessibility edge cases, i18n, collections, and conformance tests. Avoid direct dependency. |
| Radix UI | 2 | 0 | 0 | 1 | 2 | 1 | 1 | 0 | 7 | Reference only for component anatomy, keyboard behavior, and focus edge cases. Avoid direct dependency. |
| Ariakit | 1 | 0 | 0 | 1 | 1 | 1 | 1 | 0 | 5 | Reference only until license and package boundaries are verified. Useful for examples and behavior comparison. |
| Web Awesome/Shoelace | 1 | 1 | 2 | 1 | 2 | 1 | 1 | 1 | 10 | Reference for Web Component DOM contracts, parts, states, form patterns, and SSR/DSD-adjacent behavior. Clean-room only unless license/product boundary review is explicit. |
| WAI-ARIA APG | 2 | 2 | 1 | 2 | 2 | 2 | 2 | 2 | 15 | Required conformance reference for every accessible composite primitive. Not an implementation source. |
| Native browser APIs | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 16 | Prefer whenever they satisfy UX and styling constraints. Wrap instead of replacing for simple controls. |

Preliminary decisions for `@iktia/primitives`:

* **Direct dependency candidate**: `@floating-ui/dom` or `@floating-ui/core` for
  positioning only, starting in M5. Keep menu/listbox/dialog state in Iktia
  behavior kernels.
* **Adaptation candidate**: Zag.js machines for tabs, radio group, menu/select,
  and dialog-like behavior. M1 should include a spike that adapts one Zag
  machine behind `createRovingFocusBehavior` or `createSelectionBehavior`.
* **Clean-room/reference candidates**: Downshift and React Aria for select and
  combobox. Their behavior is mature, but React hooks, render props,
  collections, and component tree assumptions do not fit Iktia directly.
* **Reference-only candidates**: Radix UI and Ariakit for taxonomy, focus
  behavior, keyboard behavior, and API ergonomics. Their React component model
  is too far from Iktia's Custom Element output for direct reuse.
* **Web Component reference**: Web Awesome/Shoelace for parts, slots, custom
  states, form-control patterns, SSR behavior, and actual Web Component user
  expectations. Do not copy Lit-bound behavior or DOM shape.

### 2026-06-18 Zag Documentation Spike Result

No third-party behavior runtime was added in this pass. The spike outcome is to
keep Zag as the first serious adaptation candidate for richer composite
widgets, but to implement the current checkbox, toggle, disclosure/dropdown,
and tabs gaps with private Iktia behavior kernels.

Reasons:

* The current missing behavior is small enough to cover with deterministic
  transition functions and browser tests.
* Zag machines would still require an Iktia-specific Custom Element and Shadow
  DOM adapter before they could safely own focus, IDs, events, and cleanup.
* Adding Zag now would expose dependency and adapter questions before the first
  hard case, such as radio group, menu, select, combobox, dialog, or nested
  overlay behavior.
* The internal-kernel path keeps source compatibility with a later Zag adapter:
  the public primitives do not expose behavior-only APIs.

Abort criteria for future Zag adoption:

* the machine API leaks through public `@iktia/primitives` exports;
* a Custom Element adapter needs a runtime lifecycle layer instead of plain
  package-local helpers;
* Shadow DOM focus or outside-interaction behavior requires broad global event
  normalization;
* importing one primitive pulls unrelated machines or renderer packages.

### 2026-06-18 Zag Package Spike Result

A follow-up package spike installed `@zag-js/tabs@1.41.2` as a dev-only
dependency and compiled a private `createZagTabsProbe()` adapter against the
real `connect()` API.

Findings:

* `@zag-js/tabs` exports `machine` and `connect`, but the package does not ship
  a framework-agnostic service runner for native Custom Elements.
* `connect()` is useful as an API and prop-shape reference, but it expects a
  Zag `Service` with `send`, `context`, `state`, `prop`, and `scope`
  integration.
* A Custom Element adapter can translate Zag events such as `ARROW_NEXT`,
  `ARROW_PREV`, `HOME`, `END`, `TAB_FOCUS`, and `TAB_CLICK` into Iktia state
  transitions, but that adapter becomes real primitive infrastructure rather
  than a tiny drop-in dependency.
* The current tabs behavior remains smaller as an Iktia-owned kernel. Zag should
  be revisited for harder widgets where the state-machine value is large enough
  to justify a maintained adapter.

The next spike added a small generic `createZagService(machine, props, scope)`
runner that executes the real Zag machine transitions for click/value changes.
This makes the adapter shape concrete: a reusable Custom Element service layer
is plausible, but it must own bindable context, refs, guards, actions, event
dispatch, Shadow DOM scope, DOM effects, and cleanup. The initial runner is
still not enough to adopt Zag for keyboard focus movement because the machine's
arrow-key actions depend on real DOM trigger discovery and scheduled focus
effects.

The follow-up DOM/focus spike added a fake Shadow-DOM-style scope with
`getById()`, list `querySelectorAll()`, trigger `id`, trigger `dataset.value`,
and `focus()` support. With that scope, the same generic service runner can
drive `@zag-js/tabs` through `connect().selectNext("first")` and prove both
paths:

* `composite: false` updates selected value through Zag's own ARROW_NEXT
  transition and `selectFocusedTab` action.
* `composite: true` discovers the next trigger through Zag's DOM helpers and
  calls the trigger's `focus()` method through the supplied scope.

This reduces the unknown area. The remaining adoption work is no longer "can a
service layer exist?", but "can a production Custom Element scope wire real
Shadow DOM focus events, scheduled effects, cleanup, indicator measurement, and
browser timing without becoming a second component runtime?"

Decision after the package and service spikes: keep Zag dev-only as evidence for
this spike, do not make it a runtime dependency for the current primitives, and
do not wire the current `<iktia-tabs>` implementation to Zag yet. Re-evaluate
when a harder primitive such as radio group, menu, select, or combobox can
amortize the service layer.

Primitive-specific recommendations:

* **Button, field, input, textarea**: use native controls and Iktia styling
  contracts. No external behavior dependency.
* **Checkbox and toggle**: start native/internal. Compare Web Awesome/Shoelace
  and React Aria for indeterminate, switch semantics, labeling, and form edge
  cases. A small Iktia toggle kernel is acceptable if Form-Associated Custom
  Elements require it.
* **Radio group**: use Zag.js as the first adaptation spike. If adaptation is
  awkward, clean-room a roving-focus and single-selection kernel using Zag,
  Radix, React Aria, and APG as conformance references.
* **Tabs**: use Zag.js as the first serious source. Tabs are the best low-risk
  test for behavior-kernel architecture because they need selection,
  orientation, roving focus, and panel association but no overlay positioning.
* **Disclosure/accordion**: start with native `<details>` as the baseline, then
  compare Zag.js, Radix, Ariakit, Web Awesome, and APG. Prefer a minimal
  Iktia-owned kernel unless native behavior satisfies state reflection and
  styling needs.
* **Dropdown/menu**: split into two decisions. Use Floating UI for positioning
  if native Popover API is not enough. Evaluate Zag.js for menu state,
  typeahead, roving focus, and nested menu behavior; use Radix/Ariakit/React
  Aria/APG as conformance references.
* **Select/combobox**: defer from the first stable package unless a dedicated
  behavior spike proves the approach. Use Zag.js, Downshift, React Aria/Stately,
  and APG as the evaluation set.
* **Auto suggest and date picker**: treat as explicit custom-control candidates,
  because native browser UI is often inconsistent or not sufficiently
  customizable. They need dedicated behavior-source evaluations and must remain
  experimental until form, accessibility, localization, keyboard, and overlay
  behavior are covered.
* **Tooltip/popover/dialog**: prefer native Popover API and `<dialog>` where
  possible, Floating UI for positioning, and Zag/React Aria/Radix/APG for
  focus/dismiss/modal behavior references.

### Primitive-Specific Evaluation Order

* **Button, field, input, textarea**: start with native browser behavior. Do not
  extract kernels unless reuse appears.
* **Checkbox and toggle**: compare native controls, Web Awesome/Shoelace,
  React Aria, and Zag.js. Prefer native internal controls unless custom states
  or Form-Associated Custom Elements force a kernel.
* **Radio group and tabs**: evaluate Zag.js first, then React Aria, Radix UI,
  Ariakit, and WAI-ARIA examples. Roving focus and single-selection kernels are
  likely valuable.
* **Disclosure and accordion**: compare native `<details>`, Zag.js, Radix UI,
  Ariakit, Web Awesome/Shoelace, and WAI-ARIA examples. Prefer the smallest
  behavior that keeps ARIA and state reflection correct.
* **Dropdown and menu**: evaluate Zag.js, Floating UI, React Aria, Radix UI,
  Ariakit, Downshift, and WAI-ARIA examples. Split positioning from menu state;
  Floating UI can be a positioning dependency even if menu behavior is
  clean-room.
* **Select and combobox**: evaluate Zag.js, Downshift, React Aria/Stately, and
  WAI-ARIA examples before deciding whether these belong in the first
  primitives release.
* **Tooltip, popover, dialog**: evaluate native Popover API, `<dialog>`,
  Floating UI, Zag.js, React Aria, and Web Awesome/Shoelace. Do not stabilize
  until focus, dismiss, modality, and layering behavior are proven in browser
  tests.

### Porting Policy

* Prefer direct dependency only when the imported module is framework-agnostic,
  small, license-compatible, tree-shakable, and does not violate Iktia's runtime
  boundary.
* Prefer adaptation when the source is architecturally strong but its public API
  should be hidden behind Iktia's behavior-kernel interface.
* Prefer clean-room ports when behavior is mature but the source is tied to a
  framework, renderer, DOM shape, or incompatible API style.
* Use upstream tests and documentation as conformance references when direct
  code reuse is not appropriate.
* Keep attribution and license notes in package docs whenever implementation is
  materially derived from prior art.
* Do not expose third-party API shapes directly from `@iktia/primitives` unless
  a later stability review accepts that long-term compatibility burden.
* Never copy source code before license compatibility, attribution, and package
  boundary implications are documented.

## Component Taxonomy

### Actions

`IktiaButton` wraps button semantics with slot-based content, disabled state,
optional visual variant props, and stable `root`/`control` parts. It should use
a native `<button>` internally unless a documented constraint requires a custom
interactive element.

`IktiaButtonGroup` groups action controls and exposes orientation state. It does
not manage selection unless paired with a future segmented control primitive.

### Forms

`IktiaField` composes label, hint, error, and control slots. It owns layout and
description wiring but should not obscure the underlying input semantics.

`IktiaInput` and `IktiaTextarea` provide styled native text-entry controls with
value, disabled, invalid, required, placeholder, and name behavior.

`IktiaCheckbox` exposes checked, unchecked, and indeterminate states. It must
support keyboard toggling, label composition, disabled state, and form behavior.

`IktiaToggle` covers switch/pressed controls. It should expose `on` and `off`
states with `aria-pressed` or `role="switch"` depending on the final semantic
choice made during implementation.

`IktiaRadioGroup` and `IktiaRadio` provide single selection, roving keyboard
navigation, disabled items, orientation, and form behavior.

### Navigation And Disclosure

`IktiaTabs`, `IktiaTabList`, `IktiaTab`, and `IktiaTabPanel` provide selected
tab state, panel association, orientation, keyboard navigation, and meaningful
static HTML before upgrade.

`IktiaDisclosure` provides a single trigger and panel with open/closed state.

`IktiaAccordion` composes multiple disclosure items and defines whether single
or multiple panels may be open.

### Menus And Overlays

`IktiaDropdown`, `IktiaMenu`, and `IktiaMenuItem` are the first overlay-like
primitives. They must not ship as stable until outside click, Escape handling,
focus return, keyboard navigation, and DSD behavior are tested.

`IktiaPopover`, `IktiaTooltip`, and `IktiaDialog` are later candidates. Prefer
native platform capabilities such as the Popover API and `<dialog>` where they
meet the component requirements.

## Form Participation Decision

Form primitives must not be marked stable until native `<form>` behavior is
explicit and tested. The implementation may start with native internal controls,
but the RFC requires a milestone decision between:

* native internal controls with documented custom-element form limits;
* Form-Associated Custom Elements through `ElementInternals`;
* experimental form primitives until Iktia has enough support to guarantee
  `name`, `value`, `required`, disabled, validation, reset, and submit
  behavior.

The recommended path is to ship M2 form controls as experimental with native
internal controls, then decide Form-Associated Custom Element support in M3
before promoting any form primitive to stable.

### 2026-06-18 Spike Result

The first implementation chose the body-helper prototype:

```ts
const form = formControl({
  value: () => active() ? value : null,
  reset: () => {
    active.set(pressed)
  },
  disabled,
})
void form
```

The compiler recognizes this helper statically and emits
`static formAssociated = true`, `attachInternals()`, `setFormValue()`,
`formResetCallback()`, and `formDisabledCallback()` for the generated Custom
Element. This keeps public component source `.wc.tsx`-based and avoids
handwritten Custom Elements.

The MVP is implemented for `<iktia-checkbox>` and `<iktia-toggle>` with `name`,
`value`, submit, reset, disabled fieldset propagation, and `FormData` coverage.
It remains experimental because label association, validation, and full
cross-browser form behavior still need hardening before stability.

The static-metadata alternative remains a fallback if the body helper becomes
too hard to analyze for richer controls, but it is not the preferred API after
this spike.

## State Initialization Decision

Primitive state is uncontrolled-first. Props such as `checked`, `pressed`, and
`open` initialize local state once after initial attributes are processed and
before mount or hydration. After that, the component owns the state and emits
events for host applications. This avoids a half-controlled model while still
letting markup set initial state.

## Milestone Plan

### M0: RFC And Primitive Taxonomy

Deliverables:

* Add this RFC.
* Define the first component taxonomy.
* Define naming, package, event, parts, slots, state, and styling conventions.
* Identify form participation and overlay behavior as explicit risk areas.

Acceptance criteria:

* The RFC states that this is not a third-party code or style port.
* Every initial component category has a public DOM contract direction.
* Open implementation risks are named as milestone gates, not left implicit.

Verification:

```sh
git diff --check
rg -n "TB[D]|TO[D]O|FIX[M]E" docs/rfcs
```

### M1: Package Skeleton And Shared Contracts

Deliverables:

* Add `packages/primitives`.
* Add `@iktia/primitives` to the workspace package set and release config.
* Configure build, type-check, package metadata, and public exports.
* Add package README and docs-site reference entry.
* Add an internal behavior-kernel directory for complex primitive logic.
* Add behavior-source evaluation notes for the first implementation batch.
* Add shared docs templates for props, slots, parts, events, CSS custom
  properties, keyboard behavior, and DSD behavior.

Acceptance criteria:

* The package builds and type-checks with the workspace.
* The package has no framework or primitive-library runtime dependency.
* Behavior kernels are private package internals by default.
* The first batch has explicit adapt/depend/port/reference decisions for its
  behavior sources.
* Top-level and planned subpath import strategy is documented.
* Release config includes the package before any public publish.

Verification:

```sh
pnpm check-release-set
pnpm --filter @iktia/primitives build
pnpm --filter @iktia/primitives check-types
pnpm check
```

Planned commit:

* `feat: add primitives package skeleton`

### M2: Non-Overlay Baseline Controls

Deliverables:

* Implement `IktiaButton`.
* Implement `IktiaButtonGroup`.
* Implement `IktiaField`.
* Implement `IktiaInput`.
* Implement `IktiaTextarea`.
* Implement `IktiaCheckbox`.
* Implement `IktiaToggle`.
* Evaluate Zag.js, Downshift, React Aria, Web Awesome, and native control
  behavior before deciding whether checkbox/toggle behavior needs a kernel.
* Add focused examples for forms and actions.
* Add the first pure behavior tests only where baseline controls share logic.

Acceptance criteria:

* Components expose documented slots, parts, state attributes, events, and CSS
  custom properties.
* Disabled, invalid, checked, pressed, value, and label states are reflected
  consistently.
* Native keyboard behavior works for button and text controls.
* Checkbox and toggle keyboard behavior is covered in browser tests.
* Form controls introduced in M2 are explicitly experimental unless they already
  pass the native form contract.
* Any extracted checkbox/toggle behavior has deterministic unit tests.
* DSD output renders meaningful initial HTML before custom element upgrade.

Verification:

```sh
pnpm --filter @iktia/primitives test
pnpm --filter @iktia/primitives check-types
pnpm test:examples
pnpm check
```

Planned commits:

* `feat: add primitive action controls`
* `feat: add primitive form controls`
* `test: cover primitive behavior kernels`
* `test: cover primitive baseline interactions`

### M3: Native Form Semantics Hardening

Deliverables:

* Decide the form participation model for `IktiaInput`, `IktiaTextarea`,
  `IktiaCheckbox`, `IktiaRadioGroup`, and future select-like primitives.
* Implement or explicitly defer Form-Associated Custom Element support.
* Add reset, submit, `FormData`, `name`, `value`, `required`, disabled fieldset,
  label, and validation coverage.
* Add docs that distinguish stable form behavior from experimental behavior.

Acceptance criteria:

* Form controls behave predictably inside real `<form>` elements.
* Submitted `FormData` behavior is documented and tested.
* `form.reset()`, reset buttons, `form.requestSubmit()`, disabled fieldsets,
  labels, and native validation behavior are documented and tested.
* Validation behavior is documented and tested or explicitly marked
  experimental.
* No form primitive is marked stable without form behavior coverage.

Verification:

```sh
pnpm --filter @iktia/primitives test
pnpm test:examples
pnpm check
```

Planned commits:

* `feat: harden primitive native form behavior`
* `docs: document primitive native form semantics`

### M4: Composite Navigation Controls

Deliverables:

* Implement `IktiaTabs`, `IktiaTabList`, `IktiaTab`, and `IktiaTabPanel`.
* Implement `IktiaDisclosure`.
* Implement `IktiaAccordion`.
* Implement `IktiaRadioGroup` and `IktiaRadio` if not completed in M3.
* Evaluate Zag.js, Radix UI, Ariakit, React Aria, and WAI-ARIA examples before
  writing tabs, disclosure, accordion, and radio-group behavior.
* Add roving focus, disclosure, and single-selection behavior kernels.
* Add examples for tabs, disclosure, accordion, and radio selection.

Acceptance criteria:

* Roving focus or equivalent keyboard behavior is documented and tested.
* Orientation is reflected through `data-orientation`.
* Selected, open, disabled, and inactive states are reflected through ARIA and
  `data-*` attributes.
* Shared behavior kernels cover keyboard and state-transition edge cases with
  unit tests.
* DSD output includes meaningful selected/open content before upgrade.

Verification:

```sh
pnpm --filter @iktia/primitives test
pnpm test:examples
pnpm check
```

Planned commits:

* `feat: add primitive tabs`
* `feat: add primitive disclosure controls`
* `test: cover primitive composite keyboard behavior`

### M5: Dropdowns And Overlay Candidates

Deliverables:

* Implement `IktiaDropdown`, `IktiaMenu`, and `IktiaMenuItem`.
* Decide whether the first dropdown uses the Popover API or custom positioning.
* Evaluate Floating UI, Zag.js, Downshift, React Aria, Radix UI, and Ariakit
  before writing dropdown/menu behavior.
* Add typeahead and overlay behavior kernels if dropdown/menu need them.
* Add focus return, Escape, outside click, item selection, and keyboard
  navigation coverage.
* Keep `IktiaPopover`, `IktiaTooltip`, and `IktiaDialog` as later candidates
  unless M5 reveals that shared overlay infrastructure is required.

Acceptance criteria:

* Dropdown/menu behavior works without a global framework runtime.
* Open state is reflected through ARIA and `data-state`.
* Focus management is tested in browser tests.
* Any shared positioning or overlay helper is isolated and documented.
* Overlay behavior has unit tests for state transitions and browser tests for
  focus and DOM integration.

Verification:

```sh
pnpm --filter @iktia/primitives test
pnpm test:examples
pnpm check
```

Planned commits:

* `feat: add primitive dropdown menu`
* `test: cover primitive overlay interactions`

### M6: Docs, Examples, And Stability Review

Deliverables:

* Add docs-site pages for every primitive.
* Add a primitives kitchen-sink example.
* Add a form example.
* Add tabs/disclosure and dropdown/menu examples.
* Add theming documentation for CSS custom properties.
* Review each component and mark it stable or experimental.

Acceptance criteria:

* A user can discover the package, install it, import primitives, and customize
  them without reading source.
* Every stable primitive has docs for props, slots, parts, events, CSS custom
  properties, keyboard behavior, and DSD behavior.
* Experimental primitives are clearly labeled.
* Workspace checks, package tests, example tests, and docs checks pass.

Verification:

```sh
pnpm check
pnpm test
pnpm test:examples
pnpm build:docs
```

Planned commits:

* `docs: add primitives reference`
* `docs: add primitives examples`
* `docs: record primitives stability review`

## Test Strategy

The primitives package needs tests at several levels:

* Type tests for props, event detail types, and public exports.
* Package unit tests for pure helpers, if shared helpers are added.
* Behavior-kernel unit tests for state transitions, keyboard commands,
  typeahead, open/close changes, selection changes, and cleanup.
* Behavior-source conformance tests adapted from upstream behavior docs or test
  cases where license and scope allow it.
* Browser tests for click, keyboard, focus, disabled states, value changes, and
  form behavior.
* Native form tests for `FormData`, submit, reset, validation, disabled
  fieldsets, labels, and `requestSubmit()` where applicable.
* DSD tests for useful prerendered HTML and hydration reuse.
* Accessibility-oriented assertions for roles, ARIA attributes, labels, focus
  order, and keyboard behavior.
* Visual smoke coverage for default styling, state selectors, slots, parts, and
  theme variables.

Compiler fixtures should be added only when a primitive exposes a compiler gap
that is not already covered by existing package or example tests.

## Stability Policy

All primitives start as experimental. A primitive can be marked stable only
after:

* its public props, slots, parts, events, and CSS custom properties are
  documented;
* its interaction and keyboard behavior are tested;
* its disabled and invalid behavior is tested when applicable;
* its DSD behavior is tested;
* native `<form>` behavior is tested when applicable;
* at least one docs-site example uses it;
* extracted behavior kernels have unit coverage for their documented internal
  contracts.

Stable primitives follow semver for public TypeScript exports, attributes,
properties, event names, event detail payloads, slots, parts, and documented CSS
custom properties. Internal generated `data-iktia-*` hydration markers remain
outside the semver contract.

## Risks And Mitigations

Form behavior is the highest risk for early controls. Mitigate it by keeping
form primitives experimental until real form submission, reset, validation, and
disabled behavior are tested against actual `<form>` elements.

Overlay behavior is the highest risk for dropdowns, popovers, tooltips, and
dialogs. Mitigate it by shipping non-overlay primitives first and preferring
native platform APIs when they meet the required behavior.

Compiler expressiveness may limit primitive internals. Mitigate it by treating
primitive implementation as a source of compiler hardening issues rather than
working around the compiler with a framework runtime.

Behavior extraction could accidentally grow into a second component runtime.
Mitigate it by keeping kernels primitive-scoped, DOM-rendering-free, and inside
`@iktia/primitives`; `@iktia/runtime` remains reserved for generated-code
platform helpers.

Porting mature behavior can import incompatible assumptions. Mitigate it with a
required source evaluation before every complex primitive, and only accept
direct dependencies that are framework-agnostic, small, license-compatible, and
compatible with Custom Elements plus Shadow DOM.

Styling expectations may grow into a design system. Mitigate it by keeping
`@iktia/primitives` focused on behavior, contracts, and minimal defaults.
Opinionated themes should live in a later package or docs layer.

## Open Follow-Up Decisions

These decisions are intentionally deferred to their milestone gates:

* whether form controls use Form-Associated Custom Elements;
* whether dropdowns use the Popover API, custom positioning, or both;
* whether behavior-only modules should ever become public exports;
* which behavior sources become dependencies, clean-room ports, or conformance
  references;
* whether select should be a native-select wrapper, a custom listbox, or a later
  candidate;
* when each primitive graduates from experimental to stable.
