# Async Lifecycle Audit

This audit records the v0.1 async cleanup pass for generated `on()` handlers,
manual DOM listeners in primitives, and the `host()` lifecycle handle.

## Findings

* Generated `on()` handlers previously had no invocation-scoped cancellation.
  Async handlers could continue after a newer handler invocation, a list row
  removal, or host disconnect.
* Static `on()` listeners now receive a second `AbortSignal` argument. The
  signal is aborted on the next invocation of the same generated listener and
  when the host disconnects.
* Dynamic list-row `on()` listeners now abort the previous row handler before
  reinstalling a listener, and stale row records abort active handler work
  before their DOM nodes are removed.
* `host().update()` now returns a `Promise<AbortSignal>` that resolves after
  the next generated update pass. That signal is aborted by the next generated
  update pass or by disconnect.
* `host().queueTask()` schedules work after the next generated update pass,
  which gives primitives a supported place for DOM reads or focus work that
  depends on generated bindings being current.

## Primitive Pass

Primitive `on()` usage is synchronous today, but now has a cancellation surface
for future async handlers:

* button, checkbox, dropdown, rating group, slider, toast, and toggle use
  generated `on()` handlers for local DOM events.
* tooltip, hover-card, popover, context-menu, menu, dialog, and dropdown use
  document or host listeners for overlay behavior. These listeners are already
  tied to `AbortController` cleanup, `host().signal`, or effect cleanup.
* Zag-backed behavior kernels install internal DOM listeners as part of their
  service lifecycle. They remain owned by the service stop functions and are
  outside generated `on()` cancellation.

## Scope Boundary

Spread event attributes remain plain DOM listener assignments. They do not get
Naos re-entry signals because they are not `on()` calls and may come from
foreign object shapes. If those need lifecycle-aware cancellation later, they
should become an explicit spread-event policy rather than implicit magic.

Generated `on()` listeners invoke the supplied handler with `(event, signal)`.
They do not bind a receiver, so handlers that rely on `this` should keep using
an arrow or closure instead of a standalone `function` body.
