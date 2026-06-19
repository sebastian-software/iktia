# Generated Output Contract

Iktia's public product surface is the native Custom Element output produced
from `.wc.tsx` modules. These contracts are intentionally platform-native so
host pages can use generated elements without a framework adapter.

## Public Contract

The following generated behavior is user-facing for v0.1:

* exported PascalCase components infer stable custom-element tag names;
* destructured props become JavaScript properties and observed attributes;
* boolean props reflect as present or absent attributes;
* generated elements render into open Shadow DOM by default;
* `styles` entries become Shadow DOM `<style>` text;
* `part`, `slot`, `data-*`, `aria-*`, and common DOM attributes are emitted as
  platform attributes;
* dynamic `aria-*` values preserve `false` as `"false"`;
* `event()` dispatches native `CustomEvent` instances with Iktia's v0.1
  defaults: bubbling, composed, and not cancelable;
* explicit Declarative Shadow DOM prerendering emits host HTML with
  `<template shadowrootmode="open">`;
* generated client classes reuse an existing declarative shadow root before
  falling back to imperative `attachShadow()`.

## Internal Details

Generated implementation details are not semver-protected selectors:

* private class fields and method names;
* DOM construction order inside generated JavaScript;
* `data-iktia-*` hydration and control markers;
* text marker names such as `text0`;
* node marker names such as `node0`;
* the exact wrapper elements used for control-flow containers.

Tests may assert internal markers only to protect hydration behavior. User
docs, demos, and consumer examples must not ask application code to select or
style those markers.

## Local Contract Tests

`crates/iktia-core` contains generated-output contract tests for a
representative primitive component. Those tests protect the first batch of
public surfaces: attributes and properties, `CustomEvent` dispatch, parts,
slots, `data-state`, dynamic ARIA, Shadow DOM style injection, Declarative
Shadow DOM output, and DSD-only internal hydration markers.
