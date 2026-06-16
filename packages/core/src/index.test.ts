import { describe, expect, it } from "vitest"

import {
  Show,
  computed,
  effect,
  event,
  host,
  on,
  state,
} from "./index.js"

describe("authoring runtime stubs", () => {
  it("keeps authoring stubs compiler-only", () => {
    expect(() => state(false)).toThrow("Iktia state()")
    expect(() => computed(() => true)).toThrow("Iktia computed()")
    expect(() => effect(() => undefined)).toThrow("Iktia effect()")
    expect(() => Show({ when: true })).toThrow("Iktia Show()")
    expect(() => on("click", () => undefined)).toThrow("Iktia on()")
    expect(() => host()).toThrow("Iktia host()")
    expect(() => event<number>("change")).toThrow("Iktia event()")
  })
})
