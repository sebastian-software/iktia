import { describe, expect, it } from "vitest"

import {
  Show,
  computed,
  effect,
  event,
  formControl,
  host,
  on,
  state,
} from "./index.js"

describe("authoring runtime stubs", () => {
  it("keeps authoring stubs compiler-only", () => {
    expect(() => state(false)).toThrow("Naos state()")
    expect(() => computed(() => true)).toThrow("Naos computed()")
    expect(() => effect(() => undefined)).toThrow("Naos effect()")
    expect(() => Show({ when: true })).toThrow("Naos Show()")
    expect(() => on("click", () => undefined)).toThrow("Naos on()")
    expect(() => host()).toThrow("Naos host()")
    expect(() => event<number>("change")).toThrow("Naos event()")
    expect(() => formControl({ value: () => null })).toThrow("Naos formControl()")
  })
})
