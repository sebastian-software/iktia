# `@naos-ui/primitives`

`@naos-ui/primitives` is the first Naos-authored primitive component package.
The components are written as `.wc.tsx` modules and compiled to native Custom
Elements for distribution.

```ts
import "@naos-ui/primitives"
```

Or import individual elements:

```ts
import "@naos-ui/primitives/button"
import "@naos-ui/primitives/toggle"
```

## First Components

| Element | Purpose | Status |
| --- | --- | --- |
| `<naos-accordion>` / `<naos-accordion-item>` | Zag-backed accordion collection with roving trigger focus, disabled items, and open state events. | Experimental disclosure MVP |
| `<naos-avatar>` | Zag-backed avatar with image loading state, fallback content, status events, parts, and CSS custom properties. | Experimental feedback MVP |
| `<naos-button>` | Shadow-DOM action button with slots, variants, parts, and `naos-press`. | Experimental |
| `<naos-button-group>` | Oriented grouping for action controls. | Experimental |
| `<naos-checkbox>` | ARIA checkbox primitive with checked, indeterminate, and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-collapsible>` | Zag-backed disclosure primitive with trigger/content ARIA, disabled state, and open events. | Experimental disclosure MVP |
| `<naos-combobox>` / `<naos-combobox-item>` | Zag-backed autocomplete combobox with input, popup items, and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-context-menu>` | Zag-backed context menu region with anchored menu positioning and item selection. | Experimental overlay MVP |
| `<naos-date-picker>` | Zag-backed single-date picker with input, popup day grid, keyboard movement, and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-dialog>` | Zag-backed modal dialog with backdrop, focus trap, scroll lock, dismiss behavior, and focus return. | Experimental overlay MVP |
| `<naos-dropdown>` | Button-triggered dropdown/disclosure primitive. | Experimental |
| `<naos-editable>` | Zag-backed inline editable text control with preview/edit modes, commit/cancel behavior, and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-field>` | Field composition shell for labels, controls, hints, and errors. | Experimental |
| `<naos-file-upload>` | Zag-backed file input with dropzone, picker trigger, file list, delete controls, and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-hover-card>` | Zag-backed hover/focus preview card with positioned content and open events. | Experimental overlay MVP |
| `<naos-listbox>` / `<naos-listbox-item>` | Zag-backed listbox with selection, typeahead, disabled items, and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-menu>` / `<naos-menu-item>` | Zag-backed flat action menu with dismiss behavior, focus return, and item selection. | Experimental overlay MVP |
| `<naos-number-input>` | Zag-backed numeric input with steppers, keyboard behavior, min/max clamping, and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-pin-input>` | Zag-backed multi-field code input with keyboard, paste, complete, invalid, and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-popover>` | Zag-backed positioned popover with Escape/outside dismiss, close trigger, and focus return. | Experimental overlay MVP |
| `<naos-progress>` | Zag-backed linear progress indicator with ARIA progressbar state and indeterminate mode. | Experimental feedback MVP |
| `<naos-radio-group>` / `<naos-radio>` | Zag-backed radio collection with roving focus and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-rating-group>` | Zag-backed rating control with pointer/keyboard selection, hover events, and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-segmented-control>` / `<naos-segmented-item>` | Zag-backed single-selection segmented control with roving focus and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-select>` / `<naos-select-item>` | Zag-backed single-selection listbox popup with typeahead, open state, and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-slider>` | Zag-backed single-value slider with pointer/keyboard behavior and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-switch>` | Zag-backed on/off switch with native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-tabs>` / `<naos-tab>` / `<naos-tab-panel>` | Zag-backed tab collection with subcomponent tabs, panels, roving focus, and a legacy three-panel fallback. | Experimental |
| `<naos-tags-input>` | Zag-backed token input with delimiter entry, paste handling, delete controls, and native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-tooltip>` | Zag-backed hover/focus tooltip with positioned content, Escape close, and open events. | Experimental overlay MVP |
| `<naos-toast>` / `<naos-toast-root>` | Zag-backed toast trigger and notification root with store lifecycle, dismiss behavior, parts, and CSS custom properties. | Experimental feedback MVP |
| `<naos-toggle>` | Pressed/on-off button primitive with native `FormData` behavior. | Experimental form-associated MVP |
| `<naos-toggle-group>` / `<naos-toggle-item>` | Zag-backed single or multiple toggle collection with roving focus and native `FormData` behavior. | Experimental form-associated MVP |

## Contracts

The primitives expose platform-readable contracts:

* `part` names for styling hooks.
* `data-state`, `data-disabled`, `data-invalid`, and `data-orientation`.
* Overlay hooks such as `data-naos-overlay`, `data-modal`, `data-side`,
  `data-align`, `data-anchor-hidden`, and `data-layer` where applicable.
* Presence hooks such as `data-naos-presence`, `data-starting-style`, and
  `data-ending-style` where transient UI owns enter/exit timing.
* CSS custom properties with `--naos-*` names.
* Native ARIA attributes where the current `.wc.tsx` compiler surface supports them.
* Naos-prefixed `CustomEvent`s such as `naos-change`, `naos-select`, and
  `naos-press`.

Checkbox, combobox, date picker, editable, file upload, listbox, number input, pin input, radio group,
rating group, segmented control, slider, select, switch, tags input, toggle, and toggle group use the compiler-owned `formControl()` spike to generate
Form-Associated Custom Element output. They support `name`, `value`, submit,
reset, disabled fieldset propagation, and `FormData` in the current MVP, but
remain experimental until label association, validation, and broader
cross-browser coverage are complete.

Shared behavior lives in private package modules under `src/internal`. Simple
kernels remain under `src/internal/behavior`; Zag-backed adapters live under
`src/internal/zag`. Compound primitives can use the package-private
`context-request` helper for DOM-native child registration without a framework
runtime or public context API. Overlay primitives share a package-private
`overlay` helper for state attributes, geometry variable names, Escape routing,
outside-interaction classification, and layer stack ownership. Transient UI can
use the package-private `presence` helper for entering/open/closing/closed
phase attributes and animation-aware close teardown. They are intentionally not
public exports.
