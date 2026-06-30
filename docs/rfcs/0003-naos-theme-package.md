# RFC 0003: Naos Theme Package

Status: Draft
Date: 2026-06-18

## Summary

Add a small `@naos-ui/theme` package that provides semantic CSS custom property
presets for Naos applications and primitives.

The package should bridge Naos's Shadow DOM primitives with app-level design
tokens through normal CSS inheritance. Host applications import a preset CSS
file, set or override CSS custom properties on `:root` or a scoped container,
and Naos primitives consume those variables from inside their Shadow DOM.

The first slice is intentionally a package and documentation plan, not a visual
theme builder and not a CLI scaffolding feature. ShadCN's theming and create
flows are useful inspiration for semantic tokens, portable presets, dark-mode
overrides, and later apply/create workflows. Web Awesome's theming model is also
useful as a reference for scoped themes, low-specificity CSS variables,
light/dark scheme selectors, `color-scheme`, and the distinction between global
design tokens and component-level hooks.

Naos must not copy ShadCN or Web Awesome source, component styling, DOM
structure, registry implementation, utility system, visual-builder workflow, or
runtime architecture, and must not depend on either project.

## Goals

* Ship a public package named `@naos-ui/theme`.
* Provide a default neutral preset that works with `@naos-ui/primitives`.
* Define a small semantic token vocabulary for application surfaces, actions,
  status colors, controls, focus rings, radius, and font families.
* Keep component-specific `--naos-*` override hooks valid for users who need
  per-primitive control.
* Make light and dark themes work through CSS variable overrides, not through
  component re-rendering or a JavaScript theme runtime.
* Set `color-scheme` with the same selectors that apply light and dark tokens.
* Use low-specificity theme selectors so host applications can override preset
  tokens with ordinary CSS.
* Keep the package independent from React, ShadCN, Tailwind, Radix, CSS-in-JS,
  font loaders, icon packages, and framework adapters.
* Leave a clear later path for preset application and create-style tooling
  without changing the v0.1 CLI scope.

## Non-Goals

* Do not use ShadCN as a dependency.
* Do not use Web Awesome as a dependency.
* Do not copy ShadCN code, CSS, component names, DOM structure, visual style, or
  registry implementation.
* Do not copy Web Awesome code, CSS, component names, DOM structure, visual
  style, utility classes, palette matrix, or builder workflow.
* Do not require Tailwind or generate Tailwind configuration.
* Do not add an Naos CSS graph, Sass pipeline, PostCSS contract, CSS Modules
  contract, constructable stylesheet contract, or CSS-in-JS runtime.
* Do not add `naos init`, `naos create`, project scaffolding, or a visual
  builder in this first slice.
* Do not move primitive behavior or component rendering into `@naos-ui/theme`.
* Do not make `@naos-ui/primitives` an opinionated design system package.
* Do not load fonts or icons automatically.

## Existing Constraints

This package must fit the accepted Naos architecture:

* Naos components compile to platform-native Custom Elements with Shadow DOM.
* Component CSS currently uses Vite `?inline` CSS text imports and flat
  `ComponentOptions.styles`.
* The accepted v0.1 theming mechanism is CSS custom properties.
* Host pages can set CSS variables on the element or any ancestor, and those
  values inherit into Shadow DOM.
* Primitive styling contracts use `part`, slots, `data-state`,
  `data-disabled`, `data-invalid`, `data-orientation`, ARIA, and documented CSS
  custom properties.
* The v0.1 CLI is limited to `compile`, `prerender`, and `info`; it does not
  include `init`, `create`, or project scaffolding.

## Decisions

* `@naos-ui/theme` is a separate package from `@naos-ui/primitives`.
* `@naos-ui/theme` owns reusable theme presets and token metadata.
* `@naos-ui/primitives` owns component CSS, parts, slots, state attributes,
  events, accessibility behavior, and component-specific override variables.
* Presets are distributed as CSS files plus typed JavaScript metadata.
* The first preset is `neutral`.
* Theme CSS exposes both default root tokens and named theme scopes through
  low-specificity selectors.
* Theme CSS is wrapped in `@layer naos-theme` so ordinary application CSS can
  override preset defaults without relying on import order.
* Light mode is the default token set.
* Named theme scopes use `[data-naos-theme="<name>"]`.
* Dark mode uses `[data-naos-color-scheme="dark"]` as the public selector.
* Theme CSS sets `color-scheme: light` or `color-scheme: dark` with the same
  selectors that apply the matching token values.
* Scoped themes are supported by placing preset variables on a container
  instead of `:root`.
* Component CSS should prefer fallback chains from component-specific variables
  to role tokens to semantic tokens to literal last-resort values.
* Status tokens use `success`, `info`, `warning`, and `error`.
* `danger` is not a v1 status token. Destructive action variants should use
  `error` in the first slice unless a later decision accepts a separate
  `destructive` action role.
* Repeated primitive families share small role-token fallbacks for controls,
  overlays, feedback surfaces, tracks, ranges, and active/selected items.
* Future CLI or visual tooling must consume the same preset data model rather
  than inventing a second theme format.

## Public Surface

The first public CSS entry point:

```ts
import "@naos-ui/theme/neutral.css"
```

The first public TypeScript entry point:

```ts
import { neutralTheme, type NaosThemePreset } from "@naos-ui/theme"
```

The first public selector surface:

```html
<html data-naos-theme="neutral">
<html data-naos-theme="neutral" data-naos-color-scheme="dark">
<section data-naos-theme="neutral" data-naos-color-scheme="dark">
```

The public preset shape:

```ts
export type NaosThemeTokens = Record<string, string>

export type NaosThemePreset = {
  readonly name: string
  readonly title: string
  readonly tokens: {
    readonly theme: NaosThemeTokens
    readonly light: NaosThemeTokens
    readonly dark: NaosThemeTokens
  }
}
```

Token object keys omit the CSS variable prefix. The build output prefixes them
with `--naos-`.

Example:

```ts
export const neutralTheme = {
  name: "neutral",
  title: "Neutral",
  tokens: {
    theme: {
      "font-sans": 'Inter, ui-sans-serif, system-ui, sans-serif',
      "font-mono": '"SFMono-Regular", Consolas, monospace',
      radius: "0.375rem",
      "radius-sm": "calc(var(--naos-radius) * 0.66)",
      "radius-md": "var(--naos-radius)",
      "radius-lg": "calc(var(--naos-radius) * 1.33)",
      "radius-xl": "calc(var(--naos-radius) * 1.66)",
      "control-bg": "var(--naos-surface)",
      "control-fg": "var(--naos-foreground)",
      "control-border": "var(--naos-input)",
      "control-radius": "var(--naos-radius-md)",
      "overlay-bg": "var(--naos-overlay)",
      "overlay-fg": "var(--naos-overlay-foreground)",
      "overlay-border": "var(--naos-border)",
      "overlay-radius": "var(--naos-radius-lg)",
      "overlay-shadow": "var(--naos-shadow-md)",
      "feedback-bg": "var(--naos-surface)",
      "feedback-fg": "var(--naos-foreground)",
      "feedback-border": "var(--naos-border)",
      "feedback-radius": "var(--naos-radius-lg)",
      "feedback-shadow": "var(--naos-shadow-md)",
      "track-bg": "var(--naos-muted)",
      "range-bg": "var(--naos-primary)",
      "item-active-bg": "var(--naos-accent)",
      "item-active-fg": "var(--naos-accent-foreground)",
      "item-selected-bg": "var(--naos-primary)",
      "item-selected-fg": "var(--naos-primary-foreground)",
      "shadow-sm": "0 1px 3px rgb(15 23 42 / 0.14)",
      "shadow-md": "0 12px 28px rgb(15 23 42 / 0.14)",
      "duration-fast": "120ms",
      "duration-normal": "180ms",
    },
    light: {
      background: "#f8fafc",
      foreground: "#17201b",
      surface: "#ffffff",
      "surface-foreground": "#17201b",
      overlay: "#ffffff",
      "overlay-foreground": "#17201b",
      primary: "#0f766e",
      "primary-foreground": "#f8fffb",
      secondary: "#e2f3ea",
      "secondary-foreground": "#0f3f35",
      muted: "#edf4f0",
      "muted-foreground": "#58665f",
      accent: "#dff4ef",
      "accent-foreground": "#0f3f35",
      success: "#16815f",
      "success-foreground": "#f2fff8",
      info: "#2563eb",
      "info-foreground": "#f8fbff",
      warning: "#a15c00",
      "warning-foreground": "#fff8e5",
      error: "#b42318",
      "error-foreground": "#fff7f5",
      border: "#d6ded9",
      input: "#65736d",
      ring: "#0f766e",
    },
    dark: {
      background: "#101412",
      foreground: "#eef7f2",
      surface: "#171d1a",
      "surface-foreground": "#eef7f2",
      overlay: "#1d2420",
      "overlay-foreground": "#eef7f2",
      primary: "#5eead4",
      "primary-foreground": "#063832",
      secondary: "#24312d",
      "secondary-foreground": "#d8f5ec",
      muted: "#202925",
      "muted-foreground": "#9fb1aa",
      accent: "#1d3a35",
      "accent-foreground": "#d8f5ec",
      success: "#5ee6a8",
      "success-foreground": "#062d20",
      info: "#93c5fd",
      "info-foreground": "#0b1f3a",
      warning: "#fbbf24",
      "warning-foreground": "#332000",
      error: "#f87171",
      "error-foreground": "#3b0a0a",
      border: "#34433d",
      input: "#50635b",
      ring: "#5eead4",
    },
  },
} satisfies NaosThemePreset
```

The generated `neutral.css` should look like this in shape, not necessarily in
exact color values:

```css
@layer naos-theme {
  :where(:root),
  :where([data-naos-theme="neutral"]) {
    color-scheme: light;
    --naos-font-sans: Inter, ui-sans-serif, system-ui, sans-serif;
    --naos-font-mono: "SFMono-Regular", Consolas, monospace;
    --naos-radius: 0.375rem;
    --naos-radius-sm: calc(var(--naos-radius) * 0.66);
    --naos-radius-md: var(--naos-radius);
    --naos-radius-lg: calc(var(--naos-radius) * 1.33);
    --naos-radius-xl: calc(var(--naos-radius) * 1.66);
    --naos-control-bg: var(--naos-surface);
    --naos-control-fg: var(--naos-foreground);
    --naos-control-border: var(--naos-input);
    --naos-control-radius: var(--naos-radius-md);
    --naos-overlay-bg: var(--naos-overlay);
    --naos-overlay-fg: var(--naos-overlay-foreground);
    --naos-overlay-border: var(--naos-border);
    --naos-overlay-radius: var(--naos-radius-lg);
    --naos-overlay-shadow: var(--naos-shadow-md);
    --naos-feedback-bg: var(--naos-surface);
    --naos-feedback-fg: var(--naos-foreground);
    --naos-feedback-border: var(--naos-border);
    --naos-feedback-radius: var(--naos-radius-lg);
    --naos-feedback-shadow: var(--naos-shadow-md);
    --naos-track-bg: var(--naos-muted);
    --naos-range-bg: var(--naos-primary);
    --naos-item-active-bg: var(--naos-accent);
    --naos-item-active-fg: var(--naos-accent-foreground);
    --naos-item-selected-bg: var(--naos-primary);
    --naos-item-selected-fg: var(--naos-primary-foreground);
    --naos-shadow-sm: 0 1px 3px rgb(15 23 42 / 0.14);
    --naos-shadow-md: 0 12px 28px rgb(15 23 42 / 0.14);
    --naos-duration-fast: 120ms;
    --naos-duration-normal: 180ms;
    --naos-background: #f8fafc;
    --naos-foreground: #17201b;
    --naos-surface: #ffffff;
    --naos-surface-foreground: #17201b;
    --naos-overlay: #ffffff;
    --naos-overlay-foreground: #17201b;
    --naos-primary: #0f766e;
    --naos-primary-foreground: #f8fffb;
    --naos-secondary: #e2f3ea;
    --naos-secondary-foreground: #0f3f35;
    --naos-muted: #edf4f0;
    --naos-muted-foreground: #58665f;
    --naos-accent: #dff4ef;
    --naos-accent-foreground: #0f3f35;
    --naos-success: #16815f;
    --naos-success-foreground: #f2fff8;
    --naos-info: #2563eb;
    --naos-info-foreground: #f8fbff;
    --naos-warning: #a15c00;
    --naos-warning-foreground: #fff8e5;
    --naos-error: #b42318;
    --naos-error-foreground: #fff7f5;
    --naos-border: #d6ded9;
    --naos-input: #65736d;
    --naos-ring: #0f766e;
  }

  :where([data-naos-color-scheme="dark"]),
  :where([data-naos-theme="neutral"][data-naos-color-scheme="dark"]) {
    color-scheme: dark;
    --naos-background: #101412;
    --naos-foreground: #eef7f2;
    --naos-surface: #171d1a;
    --naos-surface-foreground: #eef7f2;
    --naos-overlay: #1d2420;
    --naos-overlay-foreground: #eef7f2;
    --naos-primary: #5eead4;
    --naos-primary-foreground: #063832;
    --naos-secondary: #24312d;
    --naos-secondary-foreground: #d8f5ec;
    --naos-muted: #202925;
    --naos-muted-foreground: #9fb1aa;
    --naos-accent: #1d3a35;
    --naos-accent-foreground: #d8f5ec;
    --naos-success: #5ee6a8;
    --naos-success-foreground: #062d20;
    --naos-info: #93c5fd;
    --naos-info-foreground: #0b1f3a;
    --naos-warning: #fbbf24;
    --naos-warning-foreground: #332000;
    --naos-error: #f87171;
    --naos-error-foreground: #3b0a0a;
    --naos-border: #34433d;
    --naos-input: #50635b;
    --naos-ring: #5eead4;
  }
}
```

## Token Model

The v1 token set is intentionally small. It has two layers:

1. semantic tokens for application meaning;
2. role tokens for repeated primitive fallback patterns.

Semantic tokens:

| Token | Purpose |
| --- | --- |
| `background` / `foreground` | Page or application shell defaults. |
| `surface` / `surface-foreground` | Cards, panels, fields, controls, and default primitive surfaces. |
| `overlay` / `overlay-foreground` | Dropdowns, popovers, menus, dialogs, and floating layers. |
| `primary` / `primary-foreground` | High-emphasis actions, selected states, and active accents. |
| `secondary` / `secondary-foreground` | Lower-emphasis filled actions and supporting controls. |
| `muted` / `muted-foreground` | Hints, descriptions, inactive text, and quiet surfaces. |
| `accent` / `accent-foreground` | Hover, highlighted, checked, and selected item states. |
| `success` / `success-foreground` | Positive status, successful validation, and completion states. |
| `info` / `info-foreground` | Informational messages, neutral notifications, and low-risk status emphasis. |
| `warning` / `warning-foreground` | Caution, pending, and recoverable warning states. |
| `error` / `error-foreground` | Invalid, failed, destructive, and unrecoverable states. |
| `border` | Default dividers and structural borders. |
| `input` | Form control borders and outline-style control treatment. |
| `ring` | Focus-visible outline and active focus affordances. |
| `radius` | Base corner radius. |
| `radius-sm`, `radius-md`, `radius-lg`, `radius-xl` | Derived radius scale for component families. |
| `font-sans`, `font-mono` | Font-family variables only; package does not load font files. |

`danger` is intentionally not part of the v1 token vocabulary. `error` is more
common as the status counterpart to `success`, and the current primitive API
already exposes error-style feedback through names such as toast `type="error"`.
If Naos later needs a separate destructive-action role, prefer a deliberate
`destructive` token decision over adding `danger` as an ambiguous status name.

Role tokens:

| Token | Purpose |
| --- | --- |
| `control-bg` / `control-fg` / `control-border` | Shared fallback for inputs, buttons, trigger controls, and form controls. |
| `control-radius` | Shared fallback radius for control-like primitives. |
| `overlay-bg` / `overlay-fg` / `overlay-border` | Shared fallback for popovers, menus, dialogs, date-picker panels, and floating layers. |
| `overlay-radius` / `overlay-shadow` | Shared geometry and elevation fallback for floating layers. |
| `feedback-bg` / `feedback-fg` / `feedback-border` | Shared fallback for toast, progress labels, avatar fallback treatment, and status surfaces. |
| `feedback-radius` / `feedback-shadow` | Shared geometry and elevation fallback for feedback surfaces. |
| `track-bg` / `range-bg` | Shared fallback for progress bars, sliders, switches, and other track/range controls. |
| `item-active-bg` / `item-active-fg` | Shared fallback for hover, highlighted, pressed, and current item states. |
| `item-selected-bg` / `item-selected-fg` | Shared fallback for selected, checked, and chosen item states. |
| `shadow-sm`, `shadow-md` | Small elevation scale for primitives that already need shadows. |
| `duration-fast`, `duration-normal` | Basic motion durations for primitive state transitions. |

Role tokens should usually be aliases to semantic tokens in the neutral preset.
They are not component-specific APIs. They exist so primitive CSS can avoid
duplicating long fallback chains across controls, overlays, feedback/status
components, and range-like primitives.

The token vocabulary should not include component-specific names such as
`button-bg` or `select-border`. Those remain primitive override hooks and are
owned by `@naos-ui/primitives`.

Broader Web Awesome-style categories remain future references, especially full
hue scales, density scales, typography scales, utility classes, and visual
builder metadata. The current primitive breadth does prove that a small shared
role-token layer removes real duplication, so controls, overlays, feedback
surfaces, tracks, ranges, active items, selected items, shadows, and basic
durations are in the v1 plan.

## Reference Learnings

Web Awesome's current theming system layers themes, palettes, variant roles, and
light/dark schemes through classes on the page or a scoped subtree. That is
more product surface than Naos should adopt in v1, but several ideas are worth
keeping:

* Use low-specificity selectors for preset tokens so application CSS can
  override them easily.
* Support named theme scopes in addition to default root tokens.
* Set `color-scheme` alongside light and dark token overrides.
* Reserve success, info, warning, and error tokens early so feedback and
  validation components do not have to overload `primary` and `accent`.
* Keep global design tokens separate from component-level override hooks.
* Use a small role-token layer for repeated primitive families instead of
  adopting a full palette or variant matrix.

The first Naos theme package should not adopt Web Awesome's full hue-scale
palette matrix, utility class layer, hosted project workflow, or visual theme
builder. Those can be evaluated later if Naos needs more than one default
preset and a real preset creation workflow.

## Primitive CSS Integration

Primitive CSS should keep existing component-level variables as the first
override point. Role tokens and semantic tokens become shared fallbacks.

Example button fallback direction:

```css
:host {
  color: var(--naos-button-fg, var(--naos-control-fg, var(--naos-foreground, #17201b)));
  font: inherit;
}

button {
  border-color: var(--naos-button-border, var(--naos-control-border, var(--naos-border, #26584a)));
  border-radius: var(--naos-button-radius, var(--naos-control-radius, var(--naos-radius-md, 0.375rem)));
  background: var(--naos-button-bg, var(--naos-control-bg, var(--naos-surface, #f3faf6)));
}

button:hover {
  background: var(--naos-button-bg-hover, var(--naos-item-active-bg, var(--naos-accent, #e2f3ea)));
}

button:focus-visible {
  outline-color: var(--naos-focus-ring, var(--naos-ring, #0f766e));
}

button[data-variant="primary"] {
  border-color: var(--naos-button-primary-border, var(--naos-primary, #0f766e));
  background: var(--naos-button-primary-bg, var(--naos-primary, #0f766e));
  color: var(--naos-button-primary-fg, var(--naos-primary-foreground, #f8fffb));
}
```

Family fallback direction:

* Form controls use `control-*` first, then `input`, `surface`,
  `foreground`, `border`, and `error` where appropriate.
* Overlay-like primitives use `overlay-*`, then `overlay`,
  `overlay-foreground`, and `border`.
* Feedback/status primitives use `feedback-*` plus `success`, `info`,
  `warning`, and `error`.
* Progress, slider, switch, and similar range-like primitives use `track-bg`
  and `range-bg`.
* Selected, checked, highlighted, hover, pressed, and active item states use
  `item-active-*`, `item-selected-*`, `accent`, or `primary` based on emphasis.

This gives users three levels of control:

1. Import a preset and use the default look.
2. Override semantic tokens for the whole application or a scoped subtree.
3. Override primitive-specific variables for exact component-level changes.

The shared role tokens should not force shared internal base components in v1.
Controls, overlays, and feedback primitives have repeated CSS relationships,
but they also have different parts, state attributes, ARIA contracts, behavior
kernels, and Shadow DOM structures. Sharing through tokens preserves that
explicit surface. A later implementation can add internal CSS recipe generation
or a narrow helper only if the primitive integration proves that duplication is
purely mechanical and the helper does not hide component-specific contracts.

Primitive CSS must not remove existing documented variables during this pass
unless a separate stability review accepts the break. Because primitives are
still experimental, names can still be rationalized, but the implementation
should prefer additive compatibility wherever practical.

## Package Shape

The package should live at `packages/theme`.

Recommended source layout:

```txt
packages/theme/
  package.json
  tsconfig.json
  scripts/build-theme.mjs
  src/index.ts
  src/presets/neutral.ts
  src/theme.test.ts
```

Recommended generated layout:

```txt
packages/theme/dist/
  index.mjs
  index.d.mts
  neutral.css
```

Recommended `package.json` exports:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.mts",
      "import": "./dist/index.mjs"
    },
    "./neutral.css": "./dist/neutral.css"
  },
  "files": ["dist/", "README.md"],
  "sideEffects": ["./dist/*.css"]
}
```

The build script should generate CSS from the preset data so the TypeScript
metadata and CSS entry points cannot drift. Hand-written CSS fixtures may exist
in tests, but package output should come from the preset object.

The package should not depend on `@naos-ui/primitives`. It can be used by any host
page, and primitives only consume the resulting CSS variables.

## Milestones

### M1: Package Foundation

Add `packages/theme` as a public workspace package.

Deliverables:

* Add `@naos-ui/theme` package metadata, TypeScript config, build script, tests,
  README, and package exports.
* Add the `NaosThemePreset` and `NaosThemeTokens` public types.
* Add `neutralTheme` as the first preset.
* Include semantic tokens, status tokens, and role tokens in the preset schema.
* Generate `dist/neutral.css` from `neutralTheme`.
* Wire the package into release and workspace validation where required:
  release-please config, release manifest, release workflow, and
  `scripts/check-release-set.mjs`.

Acceptance criteria:

* `import "@naos-ui/theme/neutral.css"` resolves from a built package.
* `import { neutralTheme } from "@naos-ui/theme"` resolves from a built package.
* CSS output is deterministic and covered by tests.
* The package tarball includes only intended distribution files.

### M2: Primitive Token Integration

Refactor primitive CSS fallbacks by family so they consume role tokens and
semantic tokens while preserving primitive-specific override hooks.

Deliverables:

* Replace direct literal-only fallbacks with component-variable to role-token to
  semantic-token to literal fallback chains.
* Normalize focus ring usage around `--naos-focus-ring` falling back to
  `--naos-ring`.
* Map form controls to `--naos-control-*`, `--naos-input`,
  `--naos-border`, `--naos-surface`, `--naos-foreground`, and
  `--naos-error` where appropriate.
* Map overlay-like primitives to `--naos-overlay-*`, `--naos-overlay`,
  `--naos-overlay-foreground`, and `--naos-border` where appropriate.
* Map feedback/status primitives to `--naos-feedback-*`,
  `--naos-success`, `--naos-info`, `--naos-warning`, and `--naos-error`.
* Map progress, slider, switch, and similar range-like primitives to
  `--naos-track-bg` and `--naos-range-bg`.
* Map selected, checked, highlighted, hover, and active item states to
  `--naos-item-active-*`, `--naos-item-selected-*`, `--naos-accent`, or
  `--naos-primary` based on emphasis.
* Map successful validation, informational, warning, and error states to
  `--naos-success`, `--naos-info`, `--naos-warning`, and `--naos-error`
  respectively.
* Avoid adding internal base components solely for styling reuse. Prefer tokens
  and documented fallback recipes unless an implementation pass proves a helper
  removes behavior or lifecycle duplication without weakening public primitive
  contracts.

Acceptance criteria:

* Existing primitive examples still render without importing `@naos-ui/theme`.
* Importing `@naos-ui/theme/neutral.css` changes shared styling through semantic
  and role tokens without requiring component source changes.
* Component-specific overrides still win over role and semantic tokens.
* Existing browser tests for parts, state attributes, and form behavior still
  pass.

### M3: Documentation

Document the theming model as a first-class Naos workflow.

Deliverables:

* Add a docs guide for installing `@naos-ui/theme`, importing `neutral.css`,
  toggling `[data-naos-color-scheme="dark"]`, and overriding tokens.
* Add a preset example showing a scoped theme container.
* Add a primitive variable matrix that distinguishes semantic tokens, role
  tokens, and component-specific override variables.
* Generate or audit the primitive variable matrix from
  `packages/primitives/src/*.wc.css` so it does not drift as new primitives are
  added.
* Update package reference docs to list `@naos-ui/theme`.
* Update demos or docs examples to show theme CSS crossing the Shadow DOM
  boundary.
* Document the relationship to ADR 0017 so users understand which selectors and
  token layers are durable decisions.

Acceptance criteria:

* A user can apply the default preset from docs alone.
* A user can create a local theme override without reading primitive source.
* Docs clearly state that fonts must be loaded by the host application.
* Docs clearly state that `@naos-ui/theme` does not require Tailwind or ShadCN.

### M4: Verification

Add tests that prove the package, generated CSS, and primitive integration work
together.

Deliverables:

* Unit tests for preset schema rules and generated CSS output.
* Package build/export tests for `@naos-ui/theme`.
* A CSS variable inventory check that catches undocumented primitive variables
  or missing matrix coverage where practical.
* Browser coverage proving CSS variables from `@naos-ui/theme/neutral.css`
  cross Shadow DOM boundaries into primitives.
* Browser coverage proving `[data-naos-color-scheme="dark"]` changes computed
  styles inside at least one primitive Shadow DOM.
* Browser coverage proving `[data-naos-theme="neutral"]` can scope theme
  variables to a subtree.
* Browser coverage proving `color-scheme` changes with the selected theme
  scheme.
* Regression coverage proving component-specific overrides beat role and
  semantic tokens.

Acceptance criteria:

* `pnpm --filter @naos-ui/theme build` passes.
* `pnpm --filter @naos-ui/theme test` passes.
* `pnpm check` passes after implementation.
* `pnpm test` passes after implementation.
* `pnpm test:examples` passes after implementation.
* `npm pack --dry-run --json` for changed public packages shows no leaked
  source scratch files or missing distribution files.

### M5: Follow-Up Planning

Capture later tooling without implementing it in v1.

Deliverables:

* Add a follow-up issue or later RFC for `naos theme apply`.
* Add a follow-up issue or later RFC for a create-style visual preset builder.
* Define that future tooling must consume `NaosThemePreset` data and emit the
  same CSS variable contract as `@naos-ui/theme`.
* Revisit ADR 0014 before adding any project scaffolding or `create` command to
  `@naos-ui/cli`.

Acceptance criteria:

* The v1 package is useful without CLI tooling.
* Future CLI and visual-builder work has a clear data contract.
* No v0.1 CLI scope is expanded as part of this RFC.

## Test Strategy

The implementation should use the same layered approach as the primitives
package:

* Package unit tests for preset validation and CSS generation.
* Type tests or compile checks for public preset exports.
* Browser tests for actual computed styles inside Shadow DOM.
* Docs examples that exercise the public import paths.
* Package tarball checks before publishing.

Recommended command sequence after implementation:

```sh
pnpm --filter @naos-ui/theme build
pnpm --filter @naos-ui/theme test
pnpm check
pnpm test
pnpm test:examples
npm pack --dry-run --json
```

Run `npm pack --dry-run --json` from each changed public package that will be
published.

## Acceptance Criteria

This RFC is complete when:

* The package boundary between `@naos-ui/theme` and `@naos-ui/primitives` is
  unambiguous.
* The initial public import paths are explicit.
* The dark-mode selector is explicit.
* The semantic, status, and role token vocabulary is explicit.
* Primitive CSS fallback precedence is explicit.
* The first implementation can proceed without deciding token scope, package
  ownership, status naming, dark-mode shape, primitive-family fallback shape,
  or CLI scope.
* Existing unrelated workspace changes are preserved and not treated as part of
  the theming implementation.

## Future Work

Future work can add more presets, preset registries, visual editing, and CLI
application flows. Those efforts must stay downstream of the v1 token contract.

Possible future commands:

```sh
naos theme apply neutral
naos theme apply ./theme.json
naos theme inspect
```

Possible create-style workflow:

* choose base colors, radius, fonts, and density in a browser UI;
* preview the result against real Naos primitives;
* export an `NaosThemePreset` JSON object and CSS file;
* optionally apply the preset to a project after a later CLI-scope decision.

These commands and visual workflows are intentionally not part of the first
implementation slice.

## Related Decisions

* [ADR 0017: Theme Package And Token Boundary](../adrs/0017-theme-package-and-token-boundary.md)
