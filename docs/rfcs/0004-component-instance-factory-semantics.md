# RFC 0004: Component Instance Factory Semantics

Status: Draft
Date: 2026-06-19

## Summary

Adopt the architectural lesson behind Remix v3's UI component model without
copying its public `return () => JSX` component shape as Iktia's default
authoring syntax.

The stronger comparison class for Iktia is not runtime-first Remix. It is the
setup-once, compiler-oriented family represented by Solid, Svelte 5, and Marko
6: component setup is not the repeated render path, reactivity is explicit or
compiler-visible, and the implementation tries to update only the affected
work. Remix is still useful as a source of host-handle and abortability ideas,
but it is the wrong baseline for Iktia's component shape.

Iktia components should be specified as instance setup functions: the exported
component function defines per-instance state, effects, events, host access,
and the declarative view for one generated Custom Element instance. The
function body is not a React-style render body that runs on every update. State
writes, prop changes, explicit host updates, and compiler-generated lifecycle
hooks drive update passes after the initial mount.

The recommended authoring shape remains:

```tsx
export function Counter({ label = "Count" }: CounterProps = {}) {
  const count = state(0)

  return (
    <button onClick={on("click", () => count.update((value) => value + 1))}>
      {label}: {count()}
    </button>
  )
}
```

The architectural contract should be clarified as:

* component setup is per Custom Element instance;
* local state and effects live for the element instance lifetime;
* the JSX return is the statically analyzable view declaration;
* generated output owns mount, update, effect cleanup, form sync, and DSD
  hydration behavior;
* `host()` should evolve toward a stable instance handle with platform-native
  cleanup and explicit update scheduling;
* abortable async work should become a first-class authoring concern;
* public authoring syntax should not imply that Iktia has a runtime component
  renderer, virtual DOM, hook runtime, or Remix compatibility target.

## Context

Remix v3's current beta UI model uses components that receive a runtime handle
and return a render function. The public examples show an outer setup function
that owns plain JavaScript state and an inner function that returns JSX on each
render.

```tsx
function CopyToClipboard(handle: Handle<{ url: string }>) {
  let state: "idle" | "copied" | "error" = "idle"

  return () => {
    return (
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(handle.props.url)
          state = "copied"
          handle.update()
        }}
      >
        {state}
      </button>
    )
  }
}
```

The exact Remix code and API are still beta. As of 2026-06-19, the official
Remix API docs list `3.0.0-beta.3` as latest. The relevant references are:

* [Remix 3 Beta Preview](https://remix.run/blog/remix-3-beta-preview)
* [Remix homepage UI example](https://remix.run/)
* [Remix `Handle` API](https://api.remix.run/api/remix/ui/interface/Handle/)
* [Remix `EntryComponent` API](https://api.remix.run/api/remix/ui/type/EntryComponent/)

The broader compiler-side references are:

* [Solid: Intro to reactivity](https://docs.solidjs.com/concepts/intro-to-reactivity)
* [Solid: Fine-grained reactivity](https://docs.solidjs.com/advanced-concepts/fine-grained-reactivity)
* [Svelte: Introducing runes](https://svelte.dev/blog/runes)
* [Marko: Compiling Fine-Grained Reactivity](https://dev.to/ryansolid/marko-compiling-fine-grained-reactivity-4lk4)

The important learning is not the arrow function itself. The important learning
is the lifecycle separation:

* setup code runs once per component instance;
* state can live in normal local variables;
* props and host state are available through a stable handle;
* updates are explicit;
* async work can be tied to `AbortSignal`;
* behavior composition can stay close to platform DOM APIs;
* the source shape is easy for humans and model-assisted tools to follow.

Iktia already shares several of those goals. ADR 0007 says Remix v3 is design
inspiration for Web composition, platform types, dependency restraint,
model-friendly source, and cohesive package surfaces. It also says Iktia should
not adopt Remix v3's runtime-first principle. Iktia remains a compiler for
native Web Components.

For the component shape decision, Remix is therefore mostly a contrast case.
Its inner render function runs after `update()`, while Iktia's source component
body is transformed into a generated Custom Element class. Solid's documented
model that components run once, Svelte 5's move from implicit `let` reactivity
to explicit `$state()`, and Marko's compiled fine-grained output are stronger
evidence for Iktia's current direction than Remix's returned render function.

## Existing Iktia Constraints

This RFC must fit the accepted Iktia architecture:

* Iktia is a Rust/OXC-powered compiler for native Custom Elements.
* Component source files use `.wc.tsx` and are transformed by the compiler.
* Authoring APIs are compile-time APIs with TypeScript stubs that throw when
  executed without the transform.
* The preferred component declaration is an exported PascalCase function.
* Props are declared through typed function parameters and destructuring
  defaults.
* Local state uses `state()`.
* Derived values use `computed()`.
* Side effects use `effect()`.
* Host access uses `host()`.
* Component-level events use `event()`.
* DOM event listeners use `on()`.
* Generated output owns Custom Element construction, observed attributes,
  property accessors, mount, update, form callbacks, effect cleanup, and DSD
  hydration.
* ADR 0005 prefers explicit, statically analyzable authoring constructs over
  general JavaScript rendering patterns.
* ADR 0013 keeps `@iktia/runtime` as a tiny platform-helper runtime and rejects
  a virtual DOM, reconciler, hook runtime, framework adapter, or component
  lifecycle runtime.

Current generated output already resembles an instance object internally:

* `#props` stores the observed property and attribute values.
* `#state` stores local state.
* `#initializeState()` initializes state once from initial props and literals.
* `#createBindings()` exposes props, state accessors, computed values, events,
  and `host()` to generated callbacks.
* `#flush()` runs the update pass, form sync, and effects.
* `#update()` applies generated DOM updates.
* `connectedCallback()` mounts or hydrates once and then flushes.
* `disconnectedCallback()` aborts the host signal and cleans up effects.

The RFC therefore does not need to invent a new runtime architecture. It needs
to decide what the public authoring model promises before v0.1 hardens.

## Design Question

Should Iktia expose Remix-style factory components as the canonical public
authoring shape?

In source form, that would look like this:

```tsx
export function Counter(handle: ComponentHandle<CounterProps>) {
  let count = 0

  return () => (
    <button
      onClick={on("click", () => {
        count += 1
        handle.update()
      })}
    >
      {handle.props.label}: {count}
    </button>
  )
}
```

This question is separate from compiler effort. The question is whether the
shape gives Iktia a better long-term architecture than the current single JSX
return shape.

## Goals

* Make the component lifecycle model explicit before the authoring API freezes.
* Capture the useful Remix v3 lesson while preserving Iktia's compiler-first
  product boundary.
* Avoid future churn caused by vague "function component" semantics.
* Preserve a model-friendly source shape for humans and AI agents.
* Keep generated Custom Element output platform-native.
* Keep DSD prerendering and hydration compatible with the source model.
* Keep room for explicit update scheduling and abortable async work.
* Keep primitive behavior kernels ergonomic for `@iktia/primitives`.

## Non-Goals

* Do not make Iktia compatible with Remix UI components.
* Do not copy Remix APIs, package names, source code, JSX runtime, mixin
  system, router, frame model, server model, or documentation.
* Do not adopt Remix's runtime-first principle.
* Do not introduce a virtual DOM, reconciler, component runtime, hook runtime,
  or framework adapter.
* Do not replace `state()`, `computed()`, `effect()`, `event()`, `on()`, or
  `host()` as the v0.1 authoring vocabulary.
* Do not require runtime execution of `.wc.tsx` source files.
* Do not make arbitrary JavaScript render functions part of the MVP syntax
  boundary.

## Evaluation Criteria

The decision should be judged by these criteria:

* **Lifecycle clarity**: Authors can tell what runs once and what updates.
* **Platform fit**: The model maps cleanly to Custom Elements, Shadow DOM,
  attributes, properties, events, forms, and `AbortSignal`.
* **Compiler fit**: The compiler can own semantics without becoming a general
  runtime framework.
* **DSD fit**: Prerendering can evaluate static structure without executing
  arbitrary browser-dependent setup code.
* **Authoring ergonomics**: Common component code stays small, readable, and
  teachable.
* **Model friendliness**: The source shape is easy for model-assisted tools to
  inspect, edit, and reason about.
* **Long-term stability**: v0.1 choices do not force a later public syntax
  migration.
* **Primitive scalability**: The model works for buttons, forms, collection
  widgets, overlays, async behavior, and Zag-backed adapters.

## Option A: Adopt Remix-Style Factory Components Publicly

Iktia could make `function Component(handle) { return () => JSX }` the canonical
authoring shape.

```tsx
export function ClipboardButton(handle: ComponentHandle<ClipboardButtonProps>) {
  let state: "idle" | "copied" | "error" = "idle"

  return () => {
    const label =
      state === "copied"
        ? "Copied"
        : state === "error"
          ? "Error"
          : "Copy"

    return (
      <button
        aria-label={label}
        onClick={on("click", async () => {
          try {
            await navigator.clipboard.writeText(handle.props.value)
            state = "copied"
          } catch {
            state = "error"
          }
          handle.update()
        })}
      >
        {label}
      </button>
    )
  }
}
```

### Advantages

This shape makes setup-vs-render explicit. The outer function is plainly setup.
The returned function is plainly the render path. Authors coming from Remix v3
can see where persistent instance state belongs.

Plain local variables are attractive. For simple state machines,
`let state = "idle"` plus `handle.update()` is conceptually lighter than a
reactive accessor for every value. It also keeps async code procedural: do
work, update a value, request a render.

The handle gives a natural home for host-level capabilities:

* stable props;
* stable IDs;
* root and element access;
* cleanup signal;
* explicit update scheduling;
* context or frame-like future APIs if Iktia ever needs them.

The model is easy to explain in runtime terms. One setup function creates a
render function. Updates call the render function again. Effects and async work
can be scoped to the handle.

For primitives, this can feel ergonomic. Widgets such as toast, combobox,
dialog, menu, and tooltip often have imperative event choreography. A
procedural setup function with a handle can be easier to read than trying to
express every intermediate value as `state()` and `computed()`.

### Disadvantages

The source shape suggests a runtime component renderer. A function returning a
function that returns JSX naturally implies that Iktia stores and calls that
render function. That is Remix's model, but it is not Iktia's core product.
Iktia's product is generated Custom Element output.

Plain local variables create a second state model. Iktia already chose
`state()` as the public writable local state primitive. If both `let value`
plus `handle.update()` and `state()` are first-class, authors must learn when
each should be used. The compiler must also define which values are observable
for text bindings, attributes, effects, form sync, and DSD prerendering.

The plain-`let` argument is also weaker than it first appears. Svelte 3 and 4
made assignments to local `let` variables reactive inside components; Svelte 5
introduced explicit `$state()` runes because implicit component-only
reactivity did not scale cleanly across files, helper functions, and normal
JavaScript modules. Iktia's explicit `state()` is closer to that newer
direction than to Svelte's older magic assignment model.

Render functions weaken the static syntax boundary. Even if the compiler can
support the shape, public render callbacks invite arbitrary JavaScript returns,
branching, local helper functions, loops, nested callbacks, and runtime-only
template construction. That fights ADR 0005's preference for explicit,
statically analyzable constructs.

Render functions also introduce a mental-model divergence. An author sees code
that appears to run on every render, but Iktia wants generated fine-grained DOM
updates, not source-level render re-execution. Code that depends on genuine
render re-execution would either be wrong or would force Iktia toward a real
runtime renderer.

The divergence is stronger for Iktia than for Solid or Remix. Solid actually
runs setup code once at runtime. Remix actually calls the returned render
function. Iktia authoring APIs are compile-time stubs, and `.wc.tsx` source is
not the runtime artifact. A returned render function therefore suggests a
runtime level that Iktia intentionally does not have.

The handle becomes a large public API too early. Stable props, update-scoped
AbortSignals, context, IDs, queueing, frame access, and task scheduling are all
useful, but exposing them through a required first parameter makes the handle
the center of every component. Iktia currently keeps host access explicit
through `host()`, so simple components do not need a handle at all.

DSD prerendering becomes harder to reason about. If the outer setup function is
treated as real runtime code, it may read `navigator`, `window`, `document`,
clipboard APIs, timers, random IDs, dates, observers, or external stores before
returning a view. Iktia can forbid those patterns, but then the ergonomic
benefit of "plain JavaScript setup" is reduced.

The syntax increases v0.1 migration risk. Current docs, examples, type tests,
and primitive code use exported PascalCase functions with one JSX return.
Switching the preferred shape now would make much of the existing authoring
surface feel provisional.

### Assessment

This option adopts the Remix lesson too literally. It maximizes explicit
setup/render separation, but it also imports runtime-first signals into a
compiler-first project. It is powerful, but it makes Iktia look like a UI
runtime that happens to compile, rather than a compiler that emits native Web
Components.

More importantly, it imports a render-repeated mental model into a setup-once
compiler. That is the wrong direction for Iktia even before considering
implementation cost.

## Option B: Keep Single JSX Return, Define Instance Factory Semantics

Iktia can keep the current public shape and explicitly define what it means.

```tsx
export function ClipboardButton({
  value = "",
}: ClipboardButtonProps = {}) {
  const status = state<"idle" | "copied" | "error">("idle")

  const label = computed(() =>
    status() === "copied"
      ? "Copied"
      : status() === "error"
        ? "Error"
        : "Copy"
  )

  return (
    <button
      aria-label={label()}
      onClick={on("click", async () => {
        try {
          await navigator.clipboard.writeText(value)
          status.set("copied")
        } catch {
          status.set("error")
        }
      })}
    >
      {label()}
    </button>
  )
}
```

The public rule:

> An exported Iktia component function is an instance setup declaration for one
> generated Custom Element instance. Its JSX return declares the view. The
> function body is not a render loop.

The generated implementation may create fields, accessors, update functions,
effect runners, form callbacks, and DOM patch code. Authors do not need to
write a returned render function to get instance-lifetime behavior.

### Advantages

This keeps Iktia's source model compact. Most components have props, a few
state values, computed values, events, and a view. The single-return shape keeps
that code direct.

The lifecycle can still be explicit in documentation and diagnostics:

* top-level declarations inside the component are setup declarations;
* `state()` initializes once per element instance;
* `state(prop)` is uncontrolled initialization from current props;
* prop and attribute changes update generated bindings;
* state writes schedule update passes;
* effects run after mount and update, with cleanup before the next pass and on
  disconnect;
* `host().signal` aborts on disconnect;
* future update-scoped signals can abort work on rerender.

The compiler keeps one syntax boundary. A component has one returned TSX
template. Control flow remains explicit through supported constructs such as
`<Show>` and keyed `.map()` rather than arbitrary render functions.

The model fits DSD. The prerenderer can evaluate prop defaults, static
structure, CSS, supported state initializers, and supported expressions without
executing a runtime setup function.

The model is honest about generated output. Iktia does not need to preserve the
source function as a callable runtime component. The source function is a
declaration that the compiler lowers to a Custom Element class.

The authoring API remains stable with current docs and tests. Existing
`state()`, `computed()`, `effect()`, `event()`, `on()`, `host()`, and
`formControl()` choices stay meaningful instead of becoming a transitional API.

The handle idea can still be adopted where it matters. `host()` can grow into a
more capable instance handle without forcing every component to receive a
handle parameter. Simple components stay simple; advanced components can ask
for host capabilities explicitly.

### Disadvantages

The setup/render split is less visually obvious than Remix's returned function.
Documentation must be clear that the component function is not React-like.

The `state()` vocabulary is more explicit than plain `let`. Authors must wrap
values that should trigger generated updates. That is intentional, but it is
less "just JavaScript" than Remix's model.

Async work needs stronger API design. Today `host().signal` covers disconnect
cleanup, and effects clean up across update passes. Event-handler async work
does not yet have a first-class update-scoped signal like Remix's `update()`
promise. If Iktia wants the same robustness, it must design that explicitly.

The handle is currently underpowered. `HostHandle` exposes `element`, `root`,
`signal`, and `update()`, but not stable props, stable IDs, queued tasks, or
update-scoped abort signals. Option B is good only if Iktia treats the handle
as a real platform contract rather than a minimal escape hatch.

### Assessment

This option captures the useful Remix architecture while preserving Iktia's
compiler-first identity. It is the best fit for v0.1 because it minimizes
public syntax churn and clarifies semantics where they already exist.

## Option C: Support Both Public Shapes

Iktia could allow both current single-return components and Remix-style factory
components.

```tsx
export function SimpleCounter() {
  const count = state(0)
  return <button>{count()}</button>
}

export function FactoryCounter(handle: ComponentHandle) {
  let count = 0
  return () => <button>{count}</button>
}
```

### Advantages

This gives advanced authors an escape hatch. Components with imperative
behavior can use the explicit factory shape, while simple components keep the
current syntax.

The project could experiment without forcing a full migration. Early adopters
could try factory syntax in primitives and examples before the API is marked
stable.

The Remix comparison becomes easy to explain because Iktia visibly supports
the same broad shape.

### Disadvantages

Two public component models create documentation and ecosystem cost. Every
guide must explain both. Every diagnostic must know which mode it is in. Every
example becomes a choice.

The two models are not just syntax variants. They imply different state,
props, update, effect, and DSD rules. If both are supported, Iktia must define
how `state()` interacts with `let`, whether `computed()` is useful inside a
render callback, whether effects run from setup or render, and whether
prerender can execute the outer function.

The existence of a factory shape makes the simpler shape look less capable.
Authors may cargo-cult the more complex model because it seems lower-level or
more powerful.

Compiler and docs boundaries would drift. Iktia would have to support a
runtime-looking authoring shape while still telling users it is not a runtime
framework.

### Assessment

This option is attractive as an experiment but weak as a v0.1 public default.
It should not be held open as a planned future public mode, because it would
create a second component lifecycle model. If Iktia ever revisits factory
syntax, it should require a new RFC that proves the shape can preserve the
same setup-once compiler semantics, not merely a feature flag that imports
render-repeated behavior.

## Recommendation

Choose Option B.

Iktia should formally define current function components as instance factory
declarations with single JSX view returns. The docs should explicitly reject
the React interpretation that the component function reruns as the render
body. The compiler-generated Custom Element class is the runtime artifact.

The recommended public mental model:

```text
source component function
  declares per-instance setup
  declares props, state, computed values, effects, events, host access
  returns one statically analyzable view

generated custom element class
  owns construction, props, attributes, state storage, mount, update,
  effects, form callbacks, hydration, disconnect cleanup, and events
```

This keeps the Remix learning where it is valuable:

* setup and update are separate phases;
* state lives for the component instance;
* updates are explicit and scheduled;
* cleanup is tied to `AbortSignal`;
* behavior stays close to DOM and platform APIs;
* source code stays model-friendly.

It avoids the parts that conflict with Iktia:

* no runtime-first component renderer;
* no public render callback by default;
* no second plain-`let` state model;
* no implicit virtual DOM or reconciler expectation;
* no pressure to execute `.wc.tsx` source at runtime;
* no broadening of supported JavaScript before compiler semantics are ready.

## Proposed Semantic Contract

### Component Setup

The exported PascalCase function is a component setup declaration. It describes
what exists for each generated Custom Element instance. The compiler may lower
the declaration into fields, helper functions, and lifecycle callbacks.

The component function body should be interpreted as:

* prop declarations;
* state declarations;
* computed declarations;
* event declarations;
* effect declarations;
* form metadata declarations;
* host access declarations;
* one JSX view declaration.

The body should not be described as an update-time render function.

### Props

Function props remain the public prop declaration surface.

```tsx
export function TextField({
  disabled = false,
  label = "Name",
}: TextFieldProps = {}) {
  return <label>{label}<input disabled={disabled} /></label>
}
```

The generated element owns `#props`, property getters/setters, observed
attributes, and conversion. Prop reads in the view should update when generated
prop storage changes.

When state initializes from a prop, the current uncontrolled-first rule remains:

```tsx
export function Checkbox({ checked = false }: CheckboxProps = {}) {
  const selected = state(checked)
}
```

`selected` initializes from `checked` once after initial attributes and before
mount or hydration. Later changes to `checked` do not automatically rebind
`selected` unless a future controlled-state RFC defines that behavior.

### State

`state()` remains the public writable local state primitive.

State values are per generated element instance. A state write schedules the
generated update pass.

Plain local variables inside component setup are allowed only when they do not
participate in generated view updates, generated attributes, generated form
values, generated effects, or DSD prerendered output. If a value affects the
view or lifecycle, it should be represented through `state()`, `computed()`,
props, or a dedicated compiler-recognized construct.

This rule keeps dataflow visible to TypeScript users and the Rust compiler.

### Computed Values

`computed()` remains the public derived-value primitive.

Computed callbacks should stay pure. A computed value can read props, state,
and other supported bindings, then return a value for text, attributes,
control flow, events, effects, or form metadata.

Computed values are the Iktia equivalent of "values recomputed during update"
without exposing a public render callback.

### Effects

`effect()` remains the explicit side-effect primitive.

Effects run after mount and after generated update passes. Cleanup functions
run before the next effect pass and on disconnect.

This maps to the instance-factory model as:

```text
setup declares effect
mount runs effect
update cleans previous effect and runs effect again
disconnect cleans effect and aborts host signal
```

Effects must not become hidden render callbacks. They are for side effects,
DOM coordination, subscriptions, observers, timers, and other cleanup-bound
work.

### Host Handle

`host()` should become the explicit access point for instance-level platform
capabilities. The current shape is:

```ts
export type HostHandle = {
  readonly element: HTMLElement
  readonly root: ParentNode
  readonly signal: AbortSignal
  update(): void
}
```

This RFC recommends treating that type as the seed of an Iktia instance handle,
not as a casual escape hatch.

Candidate future shape:

```ts
export type HostHandle<Props = unknown> = {
  readonly element: HTMLElement
  readonly root: ParentNode
  readonly props: Readonly<Props>
  readonly id: string
  readonly signal: AbortSignal
  update(): Promise<AbortSignal>
  queueTask(task: () => void): void
}
```

This is not an immediate API commitment. It is the direction that captures the
Remix lesson:

* `props` provides a stable live read model for advanced code that should not
  depend on destructured setup values;
* `id` gives deterministic instance IDs for hydration-safe internal IDs and
  cross-boundary ARIA relationships where host applications need stable
  references;
* `signal` handles disconnect cleanup;
* `update()` schedules an update and can provide an update-scoped signal;
* `queueTask()` can coordinate work after generated DOM updates.

The v0.1 decision does not need to expose all of this immediately. It should
avoid closing the door.

### Abortable Async Work

Remix v3's strongest practical lesson is abortable async behavior. Iktia should
adopt that principle even if the syntax differs.

The minimum rule:

* host disconnect aborts instance-scoped work through `host().signal`;
* effects clean up before rerun and on disconnect;
* event handlers and behavior kernels should have a path to update-scoped
  abort signals for async work that becomes stale after rerender.

Possible later API:

```tsx
const { update, signal } = host()

on("click", async () => {
  const updateSignal = await update()
  if (signal.aborted || updateSignal.aborted) return
})
```

Another possible API is an event helper that passes a signal:

```tsx
on("click", async (event, signal) => {
  await doWork(signal)
})
```

This RFC does not choose the exact API. It records that abortability is a real
architectural advantage and should be part of the Iktia handle/event design.

### Updates

Updates remain generated DOM updates, not component rerenders.

An update pass may:

* refresh dynamic text nodes;
* refresh dynamic attributes and properties;
* apply control-flow changes;
* rerender keyed list containers where supported;
* sync form values;
* run effect cleanup and effect callbacks;
* update generated listener state where needed.

An update pass should not require evaluating arbitrary JSX-producing functions
at runtime.

### DSD And Hydration

DSD prerendering depends on a constrained, statically evaluable source model.

The instance-factory semantic contract should preserve the current DSD
boundary:

* prop defaults can be evaluated;
* JSON-provided prerender props can be evaluated;
* supported `state()` initializers can be evaluated;
* static structure, slots, text, attributes, and resolved inline CSS can be
  serialized;
* effects, event handlers, browser APIs, async work, and unsupported dynamic
  expressions remain client concerns;
* hydration diagnostics should compare generated expectations against the
  prerendered root.

Public factory render functions would make this boundary more ambiguous.
Single-return instance declarations keep it clearer.

## Fine-Grained Codegen Follow-Up

The syntax decision does not by itself make Iktia's generated updates as
selective as the setup-once compiler family. The current generator has the
right broad shape but still uses a coarse update model:

* `#createBindings()` reconstructs the full binding object whenever generated
  code asks for bindings.
* `computed()` lowers to a plain function and is not memoized.
* `state.set()` calls `#flush()` synchronously.
* `#flush()` runs `#update()`, form sync, and all effects.
* `#update()` executes every generated update line.
* `#runEffects()` cleans and reruns every effect on every flush.

Those facts do not change the recommendation in this RFC. They strengthen it.
If Iktia keeps the single-return instance setup model, the next architectural
leverage is making the compiler smarter under that model, not adding a second
component syntax.

The recommended follow-up is a separate RFC for fine-grained reactive codegen:

1. **Write batching**: state writes should mark dirty sources and coalesce
   flushes into a microtask, with a synchronous escape hatch only when a
   component must observe updated DOM immediately.
2. **Compile-time dependency graph**: the compiler should collect which props,
   states, and computed values each text binding, dynamic attribute, form
   value, and effect reads, then update only affected work when a source
   changes.
3. **Per-effect dependencies**: effects should clean and rerun only when their
   tracked sources change. Direct reads in effect bodies should be
   compiler-detected; helper-function cases need an explicit dependency escape
   rather than today's no-op `void state()` markers.
4. **Memoized computed values**: pure `computed()` values should cache within
   an update pass and invalidate when their dependency sources change.

The fallback for unknown reads must be conservative: run the same broad update
behavior Iktia runs today. Correctness should dominate granularity. This keeps
the improvements incremental and compatible with the v0.1 authoring API.

## Comparison Matrix

| Criteria | Option A: Remix-style public factories | Option B: Iktia instance semantics | Option C: Both shapes |
| --- | --- | --- | --- |
| Lifecycle clarity | Strong visual setup/render split | Strong if documented clearly | Mixed; authors must choose |
| Platform fit | Good for runtime components | Strong for generated Custom Elements | Mixed |
| Compiler fit | Weaker; invites general render JS | Strong; preserves static boundary | Weakest; two analyzers |
| DSD fit | Risky unless heavily constrained | Strong | Risky for factory components |
| Authoring ergonomics | Good for imperative widgets, noisier for simple components | Good default, explicit reactive values | Fragmented |
| Model friendliness | Good locally, but broad render JS grows context | Strong because declarations are explicit | Weaker due to duplicated concepts |
| Primitive scalability | Good for behavior, risky for state consistency | Strong if `host()` and abortability improve | Mixed |
| v0.1 stability | High migration cost | Low migration cost | Medium-to-high docs and support cost |

## Consequences

### Positive

* Iktia gets a clear answer to "does the component function rerun?"
* The public syntax remains compatible with current docs, examples, tests, and
  primitives.
* The compiler can keep a narrow, explainable syntax boundary.
* Generated output remains honest: native Custom Element classes with direct
  DOM updates.
* The host handle has a principled direction instead of ad hoc growth.
* Abortable async work becomes an explicit design priority.
* Future primitive work can rely on a stable instance-lifetime model.

### Negative

* Iktia does not get Remix's visually obvious `setup -> render function` shape.
* Authors must learn that `state()` is the way to make local values reactive.
* Some imperative primitive code may feel more ceremony-heavy than Remix's
  plain local variable approach.
* More documentation precision is required because "function component" has
  strong React associations.
* A richer `host()` handle may become necessary sooner than planned.

### Neutral

* This does not reserve factory syntax as a planned future mode.
* This does not require changing generated output immediately.
* This does not require committing to a specific update-scoped signal API yet.
* This does not change the Zag-backed primitives roadmap; it clarifies the
  source semantics those primitives should use.

## Documentation Changes

The Authoring Guide should add a section near "Function Components":

```md
Iktia function components are instance setup declarations. The body is analyzed
and lowered into a generated Custom Element class. It is not called again as a
render function during updates. Use `state()`, `computed()`, prop reads,
`effect()`, and `host().update()` to participate in generated updates.
```

The Compiler Limitations document should replace language that implies a
generic `return (...)` TSX template with explicit instance-factory semantics.

ADR 0007 can remain as-is, but future ADR/RFC references should point to this
RFC when discussing Remix v3's component pattern specifically.

## Implementation Notes

This RFC is primarily semantic, but several follow-up implementation tasks are
likely useful:

1. Add docs that explicitly distinguish Iktia components from React render
   functions and Remix returned render functions.
2. Add compiler diagnostics for callback-returned JSX such as
   `return () => <button />`, explaining that public factory render functions
   are not part of the accepted v0.1 component shape.
3. Prioritize abortable async work: `host().signal` already covers disconnect
   cleanup, but Iktia still needs a design for update-scoped abort signals and
   event-handler re-entry cancellation.
4. Review generated `host()` bindings and decide whether the next small step is
   stable hydration-safe `id`, typed `props`, `queueTask()`, or
   `update(): Promise<AbortSignal>`.
5. Write a separate fine-grained reactive codegen RFC covering write batching,
   compile-time dependency graphs, per-effect dependencies, and memoized
   computed values.
6. Review `on()` and primitive behavior kernels for async cleanup gaps.
7. Add tests that prove component setup state initializes once per element
   instance and prop updates use generated update bindings rather than
   re-running setup.
8. Add DSD tests that preserve the static evaluation boundary.

## Open Questions

* Should update-scoped cancellation live on `host().update()`, event handlers,
  or both?
* Should `host()` expose stable typed `props`, or should props remain available
  only through destructured function parameters and generated bindings?
* Should the compiler provide deterministic instance IDs by default?
* Should the explicit dependency escape for effects be a new helper, an option
  on `effect()`, or a compiler-recognized wrapper around existing code?

## Acceptance Criteria

This RFC is considered accepted when:

* the authoring guide states that Iktia component functions are instance setup
  declarations, not React-like render functions;
* docs mention Remix v3's returned render function pattern only as inspiration,
  not as an Iktia compatibility target;
* the current single JSX return shape remains the canonical v0.1 authoring
  syntax;
* factory syntax is not presented as a planned future public mode;
* `host()` is treated as the explicit instance handle surface in future API
  design;
* abortable async work is tracked as a prioritized follow-up requirement;
* fine-grained reactive codegen is tracked as a separate follow-up RFC or
  implementation plan;
* callback-returned JSX is either rejected with a clear diagnostic or remains
  documented as unsupported.

## Decision

Draft recommendation: accept Option B.

Iktia should learn from Remix v3's component architecture by defining a clear
instance setup and update model. It should not adopt Remix's public component
factory syntax as the canonical authoring shape for v0.1.
