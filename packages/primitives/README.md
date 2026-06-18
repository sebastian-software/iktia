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
| `<iktia-button>` | Shadow-DOM action button with slots, variants, parts, and `iktia-press`. | Experimental |
| `<iktia-button-group>` | Oriented grouping for action controls. | Experimental |
| `<iktia-checkbox>` | ARIA checkbox primitive with checked, indeterminate, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-collapsible>` | Zag-backed disclosure primitive with trigger/content ARIA, disabled state, and open events. | Experimental disclosure MVP |
| `<iktia-combobox>` / `<iktia-combobox-item>` | Zag-backed autocomplete combobox with input, popup items, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-dropdown>` | Button-triggered dropdown/disclosure primitive. | Experimental |
| `<iktia-field>` | Field composition shell for labels, controls, hints, and errors. | Experimental |
| `<iktia-hover-card>` | Zag-backed hover/focus preview card with positioned content and open events. | Experimental overlay MVP |
| `<iktia-listbox>` / `<iktia-listbox-item>` | Zag-backed listbox with selection, typeahead, disabled items, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-menu>` / `<iktia-menu-item>` | Zag-backed flat action menu with dismiss behavior, focus return, and item selection. | Experimental overlay MVP |
| `<iktia-popover>` | Zag-backed positioned popover with Escape/outside dismiss, close trigger, and focus return. | Experimental overlay MVP |
| `<iktia-radio-group>` / `<iktia-radio>` | Zag-backed radio collection with roving focus and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-segmented-control>` / `<iktia-segmented-item>` | Zag-backed single-selection segmented control with roving focus and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-select>` / `<iktia-select-item>` | Zag-backed single-selection listbox popup with typeahead, open state, and native `FormData` behavior. | Experimental form-associated MVP |
| `<iktia-tabs>` / `<iktia-tab>` / `<iktia-tab-panel>` | Zag-backed tab collection with subcomponent tabs, panels, roving focus, and a legacy three-panel fallback. | Experimental |
| `<iktia-tooltip>` | Zag-backed hover/focus tooltip with positioned content, Escape close, and open events. | Experimental overlay MVP |
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

Checkbox, combobox, listbox, radio group, segmented control, select, toggle, and
toggle group use the compiler-owned `formControl()` spike to generate
Form-Associated Custom Element output. They support `name`, `value`, submit,
reset, disabled fieldset propagation, and `FormData` in the current MVP, but
remain experimental until label association, validation, and broader
cross-browser coverage are complete.

Shared behavior lives in private package modules under `src/internal`. Simple
kernels remain under `src/internal/behavior`; Zag-backed adapters live under
`src/internal/zag`. They are intentionally not public exports.
