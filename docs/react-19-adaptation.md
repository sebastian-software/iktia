# React 19 Adaptation Review

Status: 2026-06-16

This note reviews useful ideas from the React 19 and 19.2 family and evaluates
whether Naos should adapt them. The current npm `latest` version for both
`react` and `react-dom` was checked as `19.2.7` on 2026-06-16. The relevant
feature baseline is React 19 plus React 19.2, not an unreleased React canary.

The goal is not React compatibility. The useful question is narrower: which
ideas improve typed TSX authoring for compiler-generated native Web Components
without adding a React runtime, a virtual DOM, or React Server Components as a
platform dependency?

## Executive Recommendation

The strongest React 19 inspiration for Naos is the Actions and forms model:
HTML-first forms, async mutation state, pending status, optimistic updates,
automatic cleanup, and progressive enhancement. This maps well to native forms,
`FormData`, `SubmitEvent`, `AbortSignal`, `CustomEvent`, and form-associated
Custom Elements.

Recommended direction:

1. Add a post-v2 form milestone around `formAction()` and action state.
2. Keep the API signal-shaped instead of hook-shaped.
3. Use native form semantics first; enhance them when JavaScript and the
   Naos runtime helper are present.
4. Avoid adopting React Server Functions, the RSC transport protocol, or React
   Hook rules.
5. Treat Activity, Effect Events, View Transitions, and cache abort signals as
   later lifecycle and ergonomics work.

## Adaptation Matrix

| React concept | React value | Naos fit | Recommendation |
| --- | --- | --- | --- |
| Actions | Groups async mutations with pending, errors, ordering, optimistic UI, and form integration. | High | Adapt as compiler-known `action()` and `formAction()` primitives. |
| `<form action={fn}>` | Makes forms HTML-first while letting a function receive `FormData`. | High | Adapt with a native-first `formAction()` object accepted by `<form action={...}>`. |
| `useActionState` | Reduces previous state plus action payload into the next state, sync or async. | High | Adapt without hook naming: action objects expose `state()`, `pending()`, `data()`, `error()`, and `submit()`. |
| `useFormStatus` | Lets descendants read nearest form submission status. | High, with caution | Prefer explicit action status first; consider `formStatus()` once form scoping through Shadow DOM is designed. |
| `useOptimistic` | Shows temporary state while an Action is pending and rolls back after completion or failure. | High | Adapt as action-scoped `optimistic()` or `action.optimistic()` after action queues exist. |
| Server Functions and `"use server"` | Server-callable functions and progressive form replay in RSC frameworks. | Low | Do not adopt the protocol. Adapt only the progressive-enhancement principle through URL forms and `FormData`. |
| `useEffectEvent` | Lets effects call logic that sees latest state without resubscribing. | Medium to high | Adapt after `effect()` matures, likely as `effectEvent()` or `latest()` with compiler diagnostics. |
| `<Activity>` | Hides UI while preserving state and disconnecting effects. | Medium | Consider a compile-time `<Activity>` or `<KeepAlive>` primitive for tabs, steppers, and form drafts. |
| `cacheSignal()` | Uses `AbortSignal` to cancel work after a cache/render lifetime ends. | Medium | Extend the existing `host().signal` idea to form actions, resources, and caches. |
| `use()` and Suspense | Reads promises/context during render and coordinates fallback UI. | Low for MVP | Defer. Async rendering would widen the compiler and scheduler scope too much. |
| `<ViewTransition>` | Wraps platform View Transition API in a component abstraction. | Medium but non-core | Consider a later Web API helper, not a form milestone. |
| React Compiler | Removes manual memoization and relies on static analysis constraints. | Philosophical fit | Keep as validation of our static-analysis stance, not as an API to copy. |
| Custom Element support | React 19 improves hosting Custom Elements from React apps. | Strategic fit | Document as interoperability upside for Naos output. Nothing to implement in Naos core. |

## Form Actions As The Best Next API

React 19's forms work is attractive because it moves form management back
toward the browser. The browser already owns focus, labels, constraint
validation, submit events, `FormData`, reset behavior, and progressive
submission. Naos should lean into that rather than inventing a full form
library.

The Naos adaptation should be an action object, not a React-style hook:

```ts
type ActionContext = {
  readonly form: HTMLFormElement
  readonly submitter: HTMLElement | null
  readonly signal: AbortSignal
}

type FormAction<State> = {
  readonly state: Accessor<State>
  readonly pending: Accessor<boolean>
  readonly data: Accessor<FormData | null>
  readonly error: Accessor<unknown>
  submit(formData: FormData, context?: Partial<ActionContext>): Promise<State>
  reset(): void
}

function formAction<State>(
  reducer: (
    previousState: State,
    formData: FormData,
    context: ActionContext
  ) => State | Promise<State>,
  initialState: State
): FormAction<State>
```

Example authoring shape:

```tsx
import { Show, formAction } from "@naos-ui/core"

type ContactState = {
  ok: boolean
  message?: string
  errors?: {
    email?: string
  }
}

export function ContactForm() {
  const save = formAction<ContactState>(async (previous, formData, context) => {
    const email = String(formData.get("email") ?? "")

    if (!email.includes("@")) {
      return {
        ok: false,
        errors: {
          email: "Enter a valid email address.",
        },
      }
    }

    await fetch("/api/contact", {
      method: "POST",
      body: formData,
      signal: context.signal,
    })

    return {
      ok: true,
      message: "Saved.",
    }
  }, { ok: false })

  return (
    <form action={save} method="post">
      <label>
        Email
        <input
          name="email"
          type="email"
          aria-invalid={Boolean(save.state().errors?.email)}
        />
      </label>
      <button type="submit" disabled={save.pending()}>
        Save
      </button>
      <Show when={save.pending()}>
        <span part="status">Saving...</span>
      </Show>
      <Show when={Boolean(save.state().message)}>
        <span part="status">{save.state().message}</span>
      </Show>
    </form>
  )
}
```

Compiler/runtime responsibilities:

* intercept native `submit` events only when the `action` value is a
  `FormAction` object;
* call `preventDefault()` only for enhanced function actions;
* construct `FormData` from the real form;
* preserve browser constraint validation by relying on native submit behavior;
* expose `SubmitEvent.submitter` when available;
* set `pending()`, `data()`, and `error()` deterministically;
* pass an `AbortSignal` into each action invocation;
* run cleanup on host disconnect;
* optionally reset uncontrolled form controls after successful submission;
* keep URL `action` and `method` behavior untouched for non-enhanced forms.

This is close enough to React Actions to inherit the good mental model, but it
stays platform-native and compatible with Web Components.

## Action State Semantics

React's `useActionState` queues calls and reduces previous state into next
state. Naos should adopt the reducer idea and be explicit about scheduling.

Recommended MVP semantics:

* actions are scoped to one component instance;
* `state()` starts as the provided initial value;
* each submission receives the latest committed action state;
* submissions for the same action run sequentially by default;
* `pending()` is true while one or more submissions are active or queued;
* errors are captured in `error()` and also dispatch an optional native event;
* a disconnected host aborts active work through `AbortController`;
* future options may add `strategy: "queue" | "replace" | "drop"`.

The default sequential model is predictable and mirrors React's action-state
idea. The later `replace` strategy will be useful for search and autosave.

## Form Status

React's `useFormStatus` is smart because a submit button or status label can be
implemented as a child component without manually threading pending state. That
is valuable for reusable primitives.

Naos has an extra complication: Shadow DOM creates boundaries, and native
forms do not automatically see controls inside shadow roots unless custom
elements participate through form-associated Custom Elements.

Recommended approach:

1. Start with explicit action status: `save.pending()`, `save.data()`,
   `save.error()`.
2. Add `formStatus()` only after defining how it finds the relevant form or
   action across light DOM, Shadow DOM, slots, and nested custom elements.
3. Prefer `ElementInternals` for custom controls that need to submit values.
4. Add a primitive submit-button fixture only when form scoping is clear.

Possible later API:

```tsx
export function SubmitButton() {
  const status = formStatus()

  return (
    <button type="submit" disabled={status.pending()}>
      {status.pending() ? "Saving..." : "Save"}
    </button>
  )
}
```

This should be a P1 API decision because it affects Shadow DOM boundaries,
slots, form participation, and primitive authoring.

## Optimistic UI

React's optimistic state is compelling, but it only becomes clean once actions
exist. In Naos, optimistic state should be tied to an action lifetime rather
than global component scheduling.

Recommended shape:

```ts
const messages = signal<readonly Message[]>([])
const send = formAction(sendMessage, { ok: true })
const optimisticMessages = optimistic(messages, send, (current, formData) => [
  ...current,
  {
    id: "pending",
    text: String(formData.get("message") ?? ""),
    pending: true,
  },
])
```

Rules:

* optimistic updates can only be scheduled inside an action;
* optimistic state reverts or reconciles when the action finishes;
* rollback behavior must be deterministic and tested;
* failed actions should expose both `error()` and a native event hook;
* optimistic list updates should require a stable key strategy before becoming
  part of public docs.

This should follow form actions, not precede them.

## Effect Events

React's `useEffectEvent` separates effect subscription lifetime from logic that
needs the latest state. Naos already has `effect()` planned and now
implemented for basic lifecycle work, so this is a natural later refinement.

The problem it solves:

```tsx
effect(() => {
  const unsubscribe = subscribe(roomId, () => {
    console.log(theme())
  })

  return unsubscribe
})
```

If `theme()` changes, should the subscription restart? Usually no. The callback
should see the latest theme while the subscription remains keyed to `roomId`.

Possible Naos adaptation:

```ts
const onConnected = effectEvent(() => {
  notify(theme())
})

effect(() => {
  const unsubscribe = subscribe(roomId(), onConnected)
  return unsubscribe
})
```

This is useful, but it requires compiler diagnostics so users do not call an
effect event during render or pass it through arbitrary props. It should wait
until the effect dependency and scheduling story is more precise.

## Activity And Preserved Form Drafts

React 19.2's `<Activity>` is interesting for form-heavy Web Components because
it preserves hidden UI state while cleaning up effects. The common Web
Component version is tabs, accordions, drawers, and multi-step forms where
draft input should survive navigation.

Possible adaptation:

```tsx
<Activity mode={step() === "billing" ? "visible" : "hidden"}>
  <BillingForm />
</Activity>
```

Naos should not rush this into the MVP. It needs a clear answer for:

* whether DOM nodes stay connected or are moved into an inert cache;
* whether effects are cleaned up while hidden;
* how `host().signal` behaves across hide and reveal;
* whether hidden form controls participate in ancestor form submission;
* how accessibility is handled with `hidden`, `inert`, and focus management.

Recommendation: treat this as a later lifecycle primitive, not part of form
actions MVP.

## Server Functions And Progressive Enhancement

React Server Functions are tightly coupled to RSC-aware bundlers and framework
transport. React documentation notes that the underlying framework APIs can
change across React 19.x minor versions. That is not a good dependency shape
for Naos.

What to adapt:

* progressive form submission before JavaScript loads;
* `FormData` as the mutation payload;
* serializable action result discipline;
* untrusted input and authorization guidance in docs;
* URL fallback for regular HTML forms.

What not to adapt:

* `"use server"` directives;
* server function reference serialization;
* RSC payloads;
* action replay tied to React hydration;
* a full-stack router or server framework.

For Naos, the progressive path should stay plain HTML:

```tsx
<form action="/contact" method="post">
  <input name="email" type="email" required />
  <button type="submit">Save</button>
</form>
```

Enhanced behavior can layer on top only when an explicit `formAction()` object
is provided.

## Native Web Component Form Work

React's form APIs are useful inspiration, but Naos has a unique native
opportunity: form-associated Custom Elements.

Future form-control components should explore:

* `static formAssociated = true` in generated element classes;
* `ElementInternals`;
* `setFormValue()` for values inside Shadow DOM;
* `setValidity()` for constraint validation;
* `formDisabledCallback`;
* `formResetCallback`;
* label and accessibility integration.

This should be a separate milestone from form actions. Form actions handle
submitting forms. Form-associated custom elements handle authoring custom
controls that participate in forms. ADR 0018 documents the accepted Naos
authoring and generated-output boundary for that custom-control work.

## Proposed Roadmap Extension

This review originally proposed the form sequence as M18-M21. After the
Declarative Shadow DOM review, DSD should take the M18 slot because it affects
generated Shadow DOM lifecycle, hydration, and future form-associated element
output. The form sequence therefore shifts to M19-M22.

### M19: Native Form Actions

Purpose: add HTML-first form action management for native forms in compiled
components.

Planned commits:

* `feat: add form action authoring api`
* `feat: compile form action submit handling`
* `test: add form action state fixtures`
* `docs: document native form actions`

Acceptance criteria:

* `<form action={save}>` accepts a `FormAction` object.
* The action receives a real `FormData` instance.
* `state()`, `pending()`, `data()`, and `error()` update deterministically.
* Native URL form submission remains unchanged when `action` is a string.
* Browser smoke tests cover success, validation error, and async pending state.

### M20: Form Status And Submit Primitives

Purpose: make reusable submit/status primitives possible without prop drilling.

Planned commits:

* `feat: add form status helper`
* `test: add nested submit primitive fixture`
* `docs: document form status scoping`

Acceptance criteria:

* `formStatus()` reads the nearest supported form or action context.
* Shadow DOM and slot behavior is documented.
* Unsupported form-context lookups fail with clear diagnostics.

### M21: Optimistic Actions

Purpose: support optimistic UI during action lifetimes.

Planned commits:

* `feat: add optimistic action state`
* `test: add optimistic form submission fixture`
* `docs: document optimistic rollback semantics`

Acceptance criteria:

* Optimistic state can only be changed inside an action.
* State reconciles or rolls back after success or failure.
* Repeated submissions have deterministic ordering.

### M22: Form-Associated Custom Elements

Purpose: let generated Web Components act as real form controls when requested.

Design reference: [ADR 0018](adrs/0018-form-associated-custom-element-support.md).

Planned commits:

* `feat: add form associated component option`
* `feat: generate element internals form value wiring`
* `test: add form associated custom element fixture`
* `docs: document custom form control authoring`

Acceptance criteria:

* Generated custom controls can contribute values to `FormData`.
* Reset, disabled, validity, and label behavior are documented.
* Shadow DOM controls do not rely on hidden light-DOM inputs by default.

## Source Notes

Primary React references:

* [React 19 release notes](https://react.dev/blog/2024/12/05/react-19)
* [React 19.2 release notes](https://react.dev/blog/2025/10/01/react-19-2)
* [React `useActionState`](https://react.dev/reference/react/useActionState)
* [React DOM `useFormStatus`](https://react.dev/reference/react-dom/hooks/useFormStatus)
* [React `useOptimistic`](https://react.dev/reference/react/useOptimistic)
* [React DOM `<form>`](https://react.dev/reference/react-dom/components/form)
* [React Server Functions](https://react.dev/reference/rsc/server-functions)
* [React `useEffectEvent`](https://react.dev/reference/react/useEffectEvent)
* [React `<Activity>`](https://react.dev/reference/react/Activity)
* [React `cacheSignal`](https://react.dev/reference/react/cacheSignal)
* [React `use`](https://react.dev/reference/react/use)
* [React `<ViewTransition>`](https://react.dev/reference/react/ViewTransition)
* [React Compiler docs](https://react.dev/learn/react-compiler)

Native platform references:

* [MDN `ElementInternals`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals)
* [MDN `HTMLFormElement` submit event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event)
* [MDN `HTMLFormElement.requestSubmit()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/requestSubmit)
* [MDN `ElementInternals.setFormValue()`](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals/setFormValue)
