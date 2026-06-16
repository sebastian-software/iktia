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
})
