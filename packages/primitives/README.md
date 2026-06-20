# `@iktia/primitives`

`@iktia/primitives` is the first Iktia-authored primitive component package.
The components are written as `.wc.tsx` modules and compiled to native Custom
Elements for distribution.

```ts
import "@iktia/primitives"
```

Or import individual elements:

```ts
import "@iktia/primitives/button"
import "@iktia/primitives/toggle"
```

## First Components

| Element | Purpose | Status |
| --- | --- | --- |
| `<iktia-accordion>` / `<iktia-accordion-item>` | Zag-backed accordion collection with roving trigger focus, disabled items, and open state events. | Experimental disclosure MVP |
| `<iktia-avatar>` | Zag-backed avatar with image loading state, fallback content, status events, parts, and CSS custom properties. | Experimental feedback MVP |
| `<iktia-button>` | Shadow-DOM action button with slots, variants, parts, and `iktia-press`. | Experimental |
| `<iktia-button-group>` | Oriented grouping for action controls. | Experimental |
| `<iktia-checkbox>` | ARIA checkbox primitive with checked, indeterminate, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-collapsible>` | Zag-backed disclosure primitive with trigger/content ARIA, disabled state, and open events. | Experimental disclosure MVP |
| `<iktia-combobox>` / `<iktia-combobox-item>` | Zag-backed autocomplete combobox with input, popup items, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-context-menu>` | Zag-backed context menu region with anchored menu positioning and item selection. | Experimental overlay MVP |
| `<iktia-date-picker>` | Zag-backed single-date picker with input, popup day grid, keyboard movement, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-dialog>` | Zag-backed modal dialog with backdrop, focus trap, scroll lock, dismiss behavior, and focus return. | Experimental overlay MVP |
| `<iktia-dropdown>` | Button-triggered dropdown/disclosure primitive. | Experimental |
| `<iktia-editable>` | Zag-backed inline editable text control with preview/edit modes, commit/cancel behavior, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-field>` | Field composition shell for labels, controls, hints, and errors. | Experimental |
| `<iktia-file-upload>` | Zag-backed file input with dropzone, picker trigger, file list, delete controls, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-hover-card>` | Zag-backed hover/focus preview card with positioned content and open events. | Experimental overlay MVP |
| `<iktia-listbox>` / `<iktia-listbox-item>` | Zag-backed listbox with selection, typeahead, disabled items, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-menu>` / `<iktia-menu-item>` | Zag-backed flat action menu with dismiss behavior, focus return, and item selection. | Experimental overlay MVP |
| `<iktia-number-input>` | Zag-backed numeric input with steppers, keyboard behavior, min/max clamping, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-pin-input>` | Zag-backed multi-field code input with keyboard, paste, complete, invalid, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-popover>` | Zag-backed positioned popover with Escape/outside dismiss, close trigger, and focus return. | Experimental overlay MVP |
| `<iktia-progress>` | Zag-backed linear progress indicator with ARIA progressbar state and indeterminate mode. | Experimental feedback MVP |
| `<iktia-radio-group>` / `<iktia-radio>` | Zag-backed radio collection with roving focus and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-rating-group>` | Zag-backed rating control with pointer/keyboard selection, hover events, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-segmented-control>` / `<iktia-segmented-item>` | Zag-backed single-selection segmented control with roving focus and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-select>` / `<iktia-select-item>` | Zag-backed single-selection listbox popup with typeahead, open state, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-slider>` | Zag-backed single-value slider with pointer/keyboard behavior and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-switch>` | Zag-backed on/off switch with native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-tabs>` / `<iktia-tab>` / `<iktia-tab-panel>` | Zag-backed tab collection with subcomponent tabs, panels, roving focus, and a legacy three-panel fallback. | Experimental |
| `<iktia-tags-input>` | Zag-backed token input with delimiter entry, paste handling, delete controls, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-tooltip>` | Zag-backed hover/focus tooltip with positioned content, Escape close, and open events. | Experimental overlay MVP |
| `<iktia-toast>` / `<iktia-toast-root>` | Zag-backed toast trigger and notification root with store lifecycle, dismiss behavior, parts, and CSS custom properties. | Experimental feedback MVP |
| `<iktia-toggle>` | Pressed/on-off button primitive with native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-toggle-group>` / `<iktia-toggle-item>` | Zag-backed single or multiple toggle collection with roving focus and native `FormData` behavior. | Experimental form-associated MVP |

## Contracts

The primitives expose platform-readable contracts:

* `part` names for styling hooks.
* `data-state`, `data-disabled`, `data-invalid`, and `data-orientation`.
* CSS custom properties with `--iktia-*` names.
* Native ARIA attributes where the current `.wc.tsx` compiler surface supports them.
* Iktia-prefixed `CustomEvent`s such as `iktia-change`, `iktia-select`, and
  `iktia-press`.

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
runtime or public context API. They are intentionally not public exports.
