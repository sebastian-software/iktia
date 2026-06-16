import { describe, expect, it } from "vitest"

import { createIktiaEvent } from "./runtime.js"

describe("runtime helpers", () => {
  it("creates custom events with Iktia defaults", () => {
    const customEvent = createIktiaEvent("change", 1)

    expect(customEvent.type).toBe("change")
    expect(customEvent.detail).toBe(1)
    expect(customEvent.bubbles).toBe(true)
    expect(customEvent.composed).toBe(true)
    expect(customEvent.cancelable).toBe(false)
  })

  it("respects explicit custom event options", () => {
    const customEvent = createIktiaEvent("iktia-select", { id: "a" }, {
      bubbles: false,
      cancelable: true,
      composed: false,
    })

    expect(customEvent.type).toBe("iktia-select")
    expect(customEvent.detail).toEqual({ id: "a" })
    expect(customEvent.bubbles).toBe(false)
    expect(customEvent.composed).toBe(false)
    expect(customEvent.cancelable).toBe(true)
  })

  it("does not mutate event options", () => {
    const options = { bubbles: false, cancelable: true, composed: false }

    createIktiaEvent("change", undefined, options)

    expect(options).toEqual({ bubbles: false, cancelable: true, composed: false })
  })
})
