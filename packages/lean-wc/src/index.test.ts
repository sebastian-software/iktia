import { describe, expect, it } from "vitest"

import {
  For,
  Show,
  component,
  computed,
  createLeanEvent,
  effect,
  event,
  host,
  on,
  prop,
  signal,
  state,
  useHost,
} from "./index.js"

describe("authoring runtime stubs", () => {
  it("throw clear errors outside compiler transforms", () => {
    expect(() => component("x-test", () => ({ kind: "lean-wc.jsx" }))).toThrow(
      "lean-wc component() can only be used"
    )
  })

  it("creates runtime custom events with lean defaults", () => {
    const customEvent = createLeanEvent("change", 1)

    expect(customEvent.type).toBe("change")
    expect(customEvent.detail).toBe(1)
    expect(customEvent.bubbles).toBe(true)
    expect(customEvent.composed).toBe(true)
    expect(customEvent.cancelable).toBe(false)
  })

  it("keeps authoring stubs compiler-only", () => {
    expect(() => prop.string("label", "Label")).toThrow("lean-wc prop()")
    expect(() => state(false)).toThrow("lean-wc state()")
    expect(() => signal(false)).toThrow("lean-wc signal()")
    expect(() => computed(() => true)).toThrow("lean-wc computed()")
    expect(() => effect(() => undefined)).toThrow("lean-wc effect()")
    expect(() => Show({ when: true })).toThrow("lean-wc Show()")
    expect(() => For({ each: [1], children: () => ({ kind: "lean-wc.jsx" }) })).toThrow(
      "lean-wc For()"
    )
    expect(() => on("click", () => undefined)).toThrow("lean-wc on()")
    expect(() => host()).toThrow("lean-wc host()")
    expect(() => useHost()).toThrow("lean-wc useHost()")
    expect(() => event<number>("change")).toThrow("lean-wc event()")
  })
})
