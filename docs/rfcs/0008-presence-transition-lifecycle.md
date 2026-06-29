# RFC 0008: Presence Transition Lifecycle

Status: Draft
Date: 2026-06-30

## Summary

Define the first CSS-first transition lifecycle for transient Iktia UI. This
RFC follows issue #36 and the overlay foundation shipped in RFC 0007 / PR #80.

The first implementation slice is intentionally package-private to
`@iktia/primitives`. It gives overlays a shared presence vocabulary and a
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
| `data-iktia-presence="entering"` | Element is mounted and should render its starting style. |
| `data-iktia-presence="open"` | Element is fully open. |
| `data-iktia-presence="closing"` | Element is logically closed but still mounted for exit motion. |
| `data-iktia-presence="closed"` | Element is closed and hidden. |
| `data-iktia-presence="unmounted"` | Reserved for future helpers that physically remove a subtree. |
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

## First Consumers

`<iktia-dialog>` and `<iktia-popover>` use the helper first because both already
share the overlay kernel from RFC 0007 and both need a mounted-while-closing
state before physical portal work can be meaningful. `<iktia-tooltip>` and
`<iktia-hover-card>` follow the same contract for non-modal transient overlays.

Their default CSS uses opacity/transform transitions and CSS custom properties
for duration and easing:

* `--iktia-dialog-motion-duration`
* `--iktia-dialog-motion-easing`
* `--iktia-popover-motion-duration`
* `--iktia-popover-motion-easing`
* `--iktia-tooltip-motion-duration`
* `--iktia-tooltip-motion-easing`
* `--iktia-hover-card-motion-duration`
* `--iktia-hover-card-motion-easing`

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
