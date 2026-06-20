import { describe, expect, it } from "vitest"

import { nextCheckboxState } from "./checkbox.js"
import {
  consumeIktiaContext,
  createIktiaContext,
  provideIktiaContext,
} from "./context.js"
import {
  nextDisclosureOpen,
  shouldCloseDisclosureForKey,
} from "./disclosure.js"
import { tabsValueForKey } from "./tabs.js"
import { nextTogglePressed, toggleFormValue } from "./toggle.js"
import { normalizeZagInputPropBag, normalizeZagPropBag } from "../zag/props.js"
import { createZagScope } from "../zag/scope.js"
import { createZagService } from "../zag/service.js"
import { createZagTabsProbe } from "../zag/tabs-probe.js"

class TestCustomEvent<Detail> extends Event {
  readonly detail: Detail

  constructor(type: string, init: CustomEventInit<Detail>) {
    super(type, init)
    this.detail = init.detail as Detail
  }
}

class TestEventTarget implements EventTarget {
  parent: TestEventTarget | null = null
  private listeners = new Map<string, Set<EventListenerOrEventListenerObject>>()

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    _options?: AddEventListenerOptions | boolean
  ) {
    if (listener == null) return
    let listeners = this.listeners.get(type)
    if (listeners == null) {
      listeners = new Set()
      this.listeners.set(type, listeners)
    }
    listeners.add(listener)
  }

  dispatchEvent(event: Event) {
    for (const listener of this.listeners.get(event.type) ?? []) {
      if (typeof listener === "function") listener.call(this, event)
      else listener.handleEvent(event)
    }
    if (event.bubbles && !event.cancelBubble) {
      this.parent?.dispatchEvent(event)
    }
    return !event.defaultPrevented
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    _options?: EventListenerOptions | boolean
  ) {
    if (listener == null) return
    this.listeners.get(type)?.delete(listener)
  }
}

describe("primitive behavior kernels", () => {
  it("provides and consumes DOM-native context-request values", async () => {
    const originalCustomEvent = globalThis.CustomEvent
    globalThis.CustomEvent = TestCustomEvent as unknown as typeof CustomEvent

    const context = createIktiaContext<string>("test-context")
    const providerTarget = new TestEventTarget()
    const consumerTarget = new TestEventTarget()
    consumerTarget.parent = providerTarget
    const received: string[] = []

    const provider = provideIktiaContext({
      context,
      host: providerTarget,
      value: "initial",
    })
    const cleanup = consumeIktiaContext({
      callback(value) {
        received.push(value)
      },
      context,
      element: consumerTarget,
      subscribe: true,
    })

    await Promise.resolve()
    provider.setValue("next")
    cleanup()
    provider.setValue("ignored")
    provider.destroy()
    globalThis.CustomEvent = originalCustomEvent

    expect(received).toEqual(["initial", "next"])
  })

  it("toggles pressed state and form value", () => {
    expect(nextTogglePressed(false)).toBe(true)
    expect(nextTogglePressed(true)).toBe(false)
    expect(toggleFormValue(true, "on")).toBe("on")
    expect(toggleFormValue(false, "on")).toBeNull()
  })

  it("clears checkbox indeterminate state before toggling normally", () => {
    expect(nextCheckboxState({ checked: false, indeterminate: true })).toEqual({
      checked: true,
      indeterminate: false,
    })
    expect(nextCheckboxState({ checked: true, indeterminate: false })).toEqual({
      checked: false,
      indeterminate: false,
    })
  })

  it("maps disclosure transitions", () => {
    expect(nextDisclosureOpen(false)).toBe(true)
    expect(shouldCloseDisclosureForKey("Escape")).toBe(true)
    expect(shouldCloseDisclosureForKey("Enter")).toBe(false)
  })

  it("maps tab keyboard movement", () => {
    const values = ["first", "second", "third"]

    expect(tabsValueForKey("first", "ArrowRight", values)).toBe("second")
    expect(tabsValueForKey("first", "ArrowLeft", values)).toBe("third")
    expect(tabsValueForKey("second", "Home", values)).toBe("first")
    expect(tabsValueForKey("second", "End", values)).toBe("third")
    expect(tabsValueForKey("second", "ArrowDown", values)).toBeNull()
    expect(tabsValueForKey("second", "ArrowDown", values, "vertical")).toBe("third")
  })

  it("drives the real Zag tabs machine through the internal service adapter", () => {
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame
    const originalCss = globalThis.CSS
    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0)
      return 0
    }) as typeof requestAnimationFrame
    globalThis.CSS = {
      ...globalThis.CSS,
      escape: (value: string) => value,
    } as typeof CSS

    const probe = createZagTabsProbe({
      value: "first",
      values: ["first", "second", "third"],
    })
    const triggerProps = probe.api().getTriggerProps({ value: "second" }) as {
      onClick(event: { currentTarget: unknown; defaultPrevented: boolean }): void
    }
    triggerProps.onClick({
      currentTarget: { matches: () => false },
      defaultPrevented: false,
    })

    expect(probe.sentEvents()).toContain("TAB_CLICK")
    expect(probe.value()).toBe("second")

    const nextTriggerProps = probe.api().getTriggerProps({ value: "third" }) as {
      onClick(event: { currentTarget: unknown; defaultPrevented: boolean }): void
    }
    nextTriggerProps.onClick({
      currentTarget: { matches: () => false },
      defaultPrevented: false,
    })

    expect(probe.sentEvents()).toContain("TAB_CLICK")
    expect(probe.value()).toBe("third")

    const keyboardProbe = createZagTabsProbe({
      composite: false,
      value: "first",
      values: ["first", "second", "third"],
    })
    keyboardProbe.api().selectNext("first")

    expect(keyboardProbe.sentEvents()).toContain("ARROW_NEXT")
    expect(keyboardProbe.value()).toBe("second")

    const focusProbe = createZagTabsProbe({
      composite: true,
      value: "first",
      values: ["first", "second", "third"],
    })
    focusProbe.api().selectNext("first")

    expect(focusProbe.sentEvents()).toContain("ARROW_NEXT")
    expect(focusProbe.focusedElement()).toBe("second")

    globalThis.requestAnimationFrame = originalRequestAnimationFrame
    globalThis.CSS = originalCss
  })

  it("normalizes Zag prop bags for native element application", () => {
    expect(
      normalizeZagPropBag({
        "aria-selected": true,
        "data-selected": false,
        className: "tab",
        hidden: false,
        htmlFor: "field",
        id: "item",
        onClick: () => undefined,
        tabIndex: 0,
      })
    ).toEqual({
      "aria-selected": true,
      "data-selected": false,
      class: "tab",
      for: "field",
      hidden: false,
      id: "item",
      onClick: expect.any(Function),
      tabIndex: 0,
    })
  })

  it("maps Zag input change handlers to native input events", () => {
    const onChange = () => undefined

    expect(
      normalizeZagInputPropBag({
        id: "pin-input",
        onChange,
        onInput: undefined,
      })
    ).toEqual({
      id: "pin-input",
      onInput: onChange,
    })
  })

  it("creates a Shadow DOM-aware Zag scope from a Custom Element host", () => {
    const root = { activeElement: null }
    const win = { marker: "window" }
    const doc = { defaultView: win }
    const host = {
      id: "host-id",
      getRootNode: () => root,
      ownerDocument: doc,
    } as unknown as HTMLElement
    const scope = createZagScope({ host })

    expect(scope.id).toBe("host-id")
    expect(scope.getRootNode()).toBe(root)
    expect(scope.getDoc()).toBe(doc)
    expect(scope.getWin()).toBe(win)
    expect(scope.getById("missing")).toBeNull()
  })

  it("runs Zag service watchers, state effects, root effects, and cleanup", () => {
    const calls: string[] = []
    const service = createZagService({
      machine: {
        props({ props }) {
          return { id: "service-test", initialCount: 0, ...props }
        },
        initialState: () => "idle",
        context({ bindable, prop }) {
          return {
            count: bindable(() => ({
              defaultValue: prop("initialCount"),
            })),
          }
        },
        entry: ["rootEntry"],
        exit: ["rootExit"],
        effects: ["rootEffect"],
        watch({ action, context, track }) {
          track([() => context.get("count")], () => action(["tracked"]))
        },
        states: {
          idle: {
            effects: ["idleEffect"],
            tags: ["ready"],
            on: {
              INC: { actions: ["increment"] },
              NEXT: { target: "done", actions: ["next"] },
            },
          },
          done: {
            entry: ["doneEntry"],
            exit: ["doneExit"],
          },
        },
        implementations: {
          actions: {
            doneEntry: () => calls.push("doneEntry"),
            doneExit: () => calls.push("doneExit"),
            increment: ({ context }) => {
              context.set("count", context.get("count") + 1)
            },
            next: () => calls.push("next"),
            rootEntry: () => calls.push("rootEntry"),
            rootExit: () => calls.push("rootExit"),
            tracked: () => calls.push("tracked"),
          },
          effects: {
            idleEffect: () => {
              calls.push("idleEffect")
              return () => calls.push("idleCleanup")
            },
            rootEffect: () => {
              calls.push("rootEffect")
              return () => calls.push("rootCleanup")
            },
          },
        },
      },
    })

    expect(service.getStatus()).toBe("Started")
    expect(service.state.hasTag("ready")).toBe(true)
    expect(calls).toEqual(["rootEntry", "rootEffect", "idleEffect"])

    service.send({ type: "INC" })
    expect(service.context.get("count")).toBe(1)
    expect(calls).toContain("tracked")

    service.send({ type: "NEXT" })
    expect(service.state.matches("done")).toBe(true)
    expect(calls).toEqual([
      "rootEntry",
      "rootEffect",
      "idleEffect",
      "tracked",
      "idleCleanup",
      "doneEntry",
      "next",
    ])

    service.stop()
    service.send({ type: "INC" })

    expect(service.getStatus()).toBe("Stopped")
    expect(calls).toEqual([
      "rootEntry",
      "rootEffect",
      "idleEffect",
      "tracked",
      "idleCleanup",
      "doneEntry",
      "next",
      "doneExit",
      "rootExit",
      "rootCleanup",
    ])
  })
})
