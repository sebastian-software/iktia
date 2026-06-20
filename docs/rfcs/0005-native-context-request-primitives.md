# RFC 0005: Native Context Request for Compound Primitives

Status: Draft
Date: 2026-06-20

## Summary

Adopt a package-local implementation of the Web Components community
`context-request` protocol for compound primitives in `@iktia/primitives`.

The protocol lets child Custom Elements request parent-provided context through
a composed bubbling DOM event. It gives compound primitives a DOM-native parent
to child coordination path without a resident component tree, prop drilling, or
framework runtime context.

The first implementation slice keeps the helper private under
`packages/primitives/src/internal/behavior/context.ts` and migrates
`<iktia-radio-group>` / `<iktia-radio>` as the initial collection. Broader
primitive migrations should follow only after this contract survives review and
browser validation.

## Goals

* Use the `context-request` event name and detail shape.
* Keep the contract DOM-native: `bubbles: true`, `composed: true`, and ordinary
  `CustomEvent` dispatch.
* Keep provider and consumer helpers package-private.
* Preserve Iktia's no-framework-runtime model.
* Support nearest-provider behavior through normal event bubbling and
  `stopPropagation()`.
* Support subscriptions so parent updates can resynchronize consumers.
* Use disconnect/effect cleanup to unsubscribe consumers and remove listeners.
* Migrate one compound primitive family in this PR.

## Non-Goals

* Do not add a compiler feature.
* Do not add anything to `@iktia/runtime`.
* Do not expose public context APIs from `@iktia/primitives`.
* Do not implement Remix-style nearest live component instance lookup.
* Do not migrate every compound primitive in the first slice.

## Protocol

Consumers dispatch:

```ts
new CustomEvent("context-request", {
  bubbles: true,
  composed: true,
  detail: {
    context,
    callback(value, unsubscribe) {
      // consume value
    },
    subscribe: true,
  },
})
```

Providers listen on their host element. When the requested `context` identity
matches, the provider stops propagation, calls the callback with the current
value, and records the callback when `subscribe` is true. Later provider
updates call subscribed callbacks again.

The context identity is an object with a private `Symbol` key. Consumers and
providers compare the context object by reference; no string global registry is
introduced.

## First Migration: Radio Group

Before this RFC, the radio-group adapter scanned the host with
`querySelectorAll("iktia-radio")` and attached a `MutationObserver` to discover
child radios and prop changes.

The first migration moves ownership to the child:

* `<iktia-radio-group>` creates a package-private radio-group context provider.
* `<iktia-radio>` consumes that context from its host element.
* Each radio registers itself with the group context from an effect.
* The group context keeps a DOM-order registry, updates ARIA/state/tabindex for
  all registered radios, and handles click/keyboard selection.
* Child cleanup removes listeners and registry entries.

This preserves the existing public element API while replacing parent scans
with child registration. The same pattern can later move to tabs, accordion,
segmented control, toggle group, menu, listbox, select, and combobox.

## DSD and Hydration

The protocol is client behavior. Declarative Shadow DOM can still serialize the
static element tree; client hydration/connection wires context once elements are
connected. No server-side component tree or context serialization is required.

## Risks

* Consumers connecting before a provider exists can miss an immediate context
  response. The helper performs an immediate request plus one microtask retry to
  cover normal Custom Element connection ordering, but it does not poll.
* Context values must stay package-private until the primitive composition
  contracts stabilize.
* Collection registry order depends on DOM order. Helpers should sort by
  `compareDocumentPosition()` instead of registration order.

## Follow-Ups

* Migrate `<iktia-tabs>` / `<iktia-tab>` / `<iktia-tab-panel>`.
* Migrate radio-like collections: segmented control and toggle group.
* Evaluate listbox/menu/select/combobox item registration after the simpler
  collections are stable.
* Add browser-level interaction tests once the browser gate grows beyond package
  build assertions.
