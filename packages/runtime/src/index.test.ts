import { describe, expect, it } from "vitest"

import { createNaosEvent, scheduleNaosUpdate } from "./runtime.js"

describe("runtime helpers", () => {
  it("creates custom events with Naos defaults", () => {
    const customEvent = createNaosEvent("change", 1)

    expect(customEvent.type).toBe("change")
    expect(customEvent.detail).toBe(1)
    expect(customEvent.bubbles).toBe(true)
    expect(customEvent.composed).toBe(true)
    expect(customEvent.cancelable).toBe(false)
  })

  it("respects explicit custom event options", () => {
    const customEvent = createNaosEvent("naos-select", { id: "a" }, {
      bubbles: false,
      cancelable: true,
      composed: false,
    })

    expect(customEvent.type).toBe("naos-select")
    expect(customEvent.detail).toEqual({ id: "a" })
    expect(customEvent.bubbles).toBe(false)
    expect(customEvent.composed).toBe(false)
    expect(customEvent.cancelable).toBe(true)
  })

  it("does not mutate event options", () => {
    const options = { bubbles: false, cancelable: true, composed: false }

    createNaosEvent("change", undefined, options)

    expect(options).toEqual({ bubbles: false, cancelable: true, composed: false })
  })

  it("schedules generated updates in a microtask", async () => {
    const calls: string[] = []

    scheduleNaosUpdate(() => calls.push("flush"))
    calls.push("sync")

    expect(calls).toEqual(["sync"])
    await Promise.resolve()
    expect(calls).toEqual(["sync", "flush"])
  })
})
