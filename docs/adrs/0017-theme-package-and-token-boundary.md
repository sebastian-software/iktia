# ADR 0017: Theme Package And Token Boundary

Status: Accepted

Weight: P1

## Context

Naos primitives expose platform-native styling contracts through Shadow DOM,
parts, slots, state attributes, ARIA, and CSS custom properties. ADR 0015
already establishes CSS custom properties as the v0.1 theming mechanism, but it
does not define where reusable theme presets live or how package-level theme
tokens relate to primitive-specific override hooks.

Reference systems such as ShadCN and Web Awesome show useful patterns for this
boundary. ShadCN demonstrates portable theme presets and create/apply workflows.
Web Awesome demonstrates stackable theme, palette, variant, and light/dark
scheme layers, low-specificity CSS token selectors, scoped light/dark sections,
and a clear split between global design tokens and component-level styling
hooks.

Naos should learn from those systems without copying their source, component
CSS, DOM structure, registry shape, palette matrix, utility classes, hosted
project workflow, or visual builder.

## Decision

Create a separate `@naos-ui/theme` package for reusable theme presets and token
metadata.

The `@naos-ui/theme` package owns semantic CSS custom properties and generated
preset CSS. The `@naos-ui/primitives` package owns primitive component CSS,
parts, slots, state attributes, events, accessibility behavior, and
primitive-specific override variables.

Theme CSS uses Naos-prefixed global tokens such as `--naos-background`,
`--naos-surface`, `--naos-primary`, `--naos-success`, `--naos-info`,
`--naos-warning`, `--naos-error`, `--naos-border`, `--naos-input`,
`--naos-ring`, `--naos-radius`, and `--naos-font-sans`.

The first theme slice also includes a small role-token layer for repeated
primitive families, such as `--naos-control-bg`,
`--naos-control-border`, `--naos-overlay-bg`,
`--naos-feedback-bg`, `--naos-track-bg`, and `--naos-range-bg`.
These role tokens are shared fallback points, not component APIs.
Primitive-specific variables remain the exact override layer for individual
components.

Theme CSS must use low-specificity selectors so host applications can override
tokens without fighting the preset. Generated preset CSS should also use a
named cascade layer, `naos-theme`, so normal application CSS can override theme
defaults without depending on import order. The default selector shape is:

```css
@layer naos-theme {
  :where(:root),
  :where([data-naos-theme="neutral"]) {
    color-scheme: light;
  }

  :where([data-naos-color-scheme="dark"]),
  :where([data-naos-theme="neutral"][data-naos-color-scheme="dark"]) {
    color-scheme: dark;
  }
}
```

The public theme selectors are:

* `data-naos-theme="<name>"` for a named theme scope;
* `data-naos-color-scheme="dark"` for dark-mode overrides.

Light mode is the default token set. Dark mode is opt-in through
`data-naos-color-scheme="dark"` on `:root` or a subtree. The CSS `color-scheme`
property must be set with the same selectors so native controls and browser UI
match the selected scheme.

Primitive CSS must use fallback chains that preserve component-specific
overrides while consuming role tokens and semantic theme tokens:

```css
border-color: var(--naos-button-border, var(--naos-control-border, var(--naos-border, #26584a)));
background: var(--naos-button-bg, var(--naos-control-bg, var(--naos-surface, #f3faf6)));
outline-color: var(--naos-focus-ring, var(--naos-ring, #0f766e));
```

Do not adopt a full Web Awesome-style palette and variant class system in the
first theme slice. Status roles use `success`, `info`, `warning`, and `error`.
`danger` is not a v1 status token; destructive actions should use `error`
unless a later RFC or ADR accepts a separate action role such as
`destructive`. A complete hue-scale matrix, utility layer, and visual theme
builder require later RFCs or ADRs.

Do not introduce shared internal base components purely to reduce repeated CSS
fallback chains in the first theme slice. Shared styling should flow through
tokens and documented fallback recipes. Internal component abstractions should
only be introduced later when they remove behavior or lifecycle duplication
without hiding primitive-specific parts, state attributes, and accessibility
contracts.

Do not add `naos init`, `naos create`, or `naos theme apply` as part of the
first theme package. CLI theming workflows require a later update to the
minimal CLI scope decision.

## Alternatives

* Put theme CSS and token metadata directly in `@naos-ui/primitives`.
* Keep theming as docs-only snippets with no installable package.
* Adopt ShadCN's theme registry shape directly.
* Adopt Web Awesome's full stackable theme, palette, variant, utility, and
  builder model immediately.
* Use unprefixed global theme custom properties.
* Add a JavaScript theme runtime or CSS-in-JS layer.

## Consequences

* `@naos-ui/primitives` stays focused on behavior, accessibility, DOM contracts,
  and minimal default CSS.
* `@naos-ui/theme` can evolve reusable presets without becoming a component
  runtime.
* Host applications can theme globally or per subtree with normal CSS
  inheritance.
* Component-specific variables remain the exact override layer for individual
  primitives.
* A small role-token layer reduces repeated primitive fallback logic without
  turning `@naos-ui/primitives` into an opinionated design system.
* `color-scheme` keeps native controls aligned with light and dark tokens.
* The first implementation stays smaller than Web Awesome's full theme system
  while preserving a later path to palettes, variant-role mapping, grouped
  component recipes, and visual tooling.

## Related Milestones

RFC 0003
