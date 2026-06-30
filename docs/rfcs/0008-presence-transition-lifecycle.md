# RFC 0008: Presence Transition Lifecycle

Status: Draft
Date: 2026-06-30

## Summary

Define the first CSS-first transition lifecycle for transient Naos UI. This
RFC follows issue #36 and the overlay foundation shipped in RFC 0007 / PR #80.

The first implementation slice is intentionally package-private to
`@naos-ui/primitives`. It gives overlays a shared presence vocabulary and a
small animation-aware teardown helper, without adding compiler-level transition
syntax or FLIP list movement yet.

## Decision

Split animation work into three phases:

1. **Presence lifecycle for transient UI**: package-private primitive helpers
   for entering, open, closing, closed, and future unmounted phases.
2. **Compiler-authored CSS transitions**: later syntax or helper lowering for
   generated enter/leave classes or keyframes.
3. **FLIP movement**: later keyed-list work after list reconciliation exposes a
   stable before/after measurement point.

This PR implements only the first layer.

## Public Styling Contract

Transient primitives may expose these attributes on their root, positioner,
backdrop, popup, or equivalent parts:

| Hook | Meaning |
| --- | --- |
| `data-naos-presence="entering"` | Element is mounted and should render its starting style. |
| `data-naos-presence="open"` | Element is fully open. |
| `data-naos-presence="closing"` | Element is logically closed but still mounted for exit motion. |
| `data-naos-presence="closed"` | Element is closed and hidden. |
| `data-naos-presence="unmounted"` | Reserved for future helpers that physically remove a subtree. |
| `data-starting-style` | Present during the first rendered enter frame. |
| `data-ending-style` | Present while close animations/transitions are running. |

`data-state` remains the logical open/closed state used by overlay and control
contracts. Presence attributes describe the transient lifecycle around that
state.

## Runtime Behavior

The package-private helper in `src/internal/behavior/presence.ts` owns:

* phase transitions from closed to entering to open;
* phase transitions from open to closing to closed;
* stable `data-*` attributes for CSS selectors;
* hidden-state normalization so a closing overlay can remain visible;
* `Element.getAnimations({ subtree: true })` based exit completion;
* reduced-motion fast-path support through `prefers-reduced-motion`.

The helper does not own rendering, CSS generation, compiler syntax, FLIP
measurement, or portal movement.

Shared spring timing is now coordinated through `@naos-ui/motion` token helpers:
the runtime helper returns a stable class name and the primitives build emits
the matching CSS custom-property rule into each component's Shadow DOM styles.
This keeps the presence lifecycle free of inline `style` string generation while
still preserving browser-native CSS variables for component overrides.

## First Consumers

`<naos-dialog>` and `<naos-popover>` use the helper first because both already
share the overlay kernel from RFC 0007 and both need a mounted-while-closing
state before physical portal work can be meaningful. `<naos-tooltip>` and
`<naos-hover-card>` follow the same contract for non-modal transient overlays.

Their default CSS uses opacity/transform transitions and CSS custom properties
for duration and easing:

* `--naos-dialog-motion-duration`
* `--naos-dialog-motion-easing`
* `--naos-popover-motion-duration`
* `--naos-popover-motion-easing`
* `--naos-tooltip-motion-duration`
* `--naos-tooltip-motion-easing`
* `--naos-hover-card-motion-duration`
* `--naos-hover-card-motion-easing`

The shared fallback variables are emitted by a deterministic generated class:

```css
.naos-motion-presence-spring-snappy {
  --naos-presence-motion-duration: 420ms;
  --naos-presence-motion-easing: linear(...);
}
```

## Follow-Up Work

* Apply presence to menu, context menu, select, combobox, and toast once the
  first non-modal consumer behavior is stable.
* Add compiler-level transition authoring after the public helper shape is
  proven in primitives.
* Add FLIP only after keyed list reconciliation exposes stable before/after DOM
  measurement hooks.
* Keep JavaScript per-frame `tick` animations out of the first compiler slice.

## Acceptance Criteria

* Presence phases are package-private and framework-free.
* Closing dialog/popover content can remain mounted until CSS transitions
  settle.
* Reduced-motion users are not forced through long teardown delays.
* The package build ships the private helper needed by compiled primitives.
* No React, Svelte, Base UI, or animation runtime dependency is added.
