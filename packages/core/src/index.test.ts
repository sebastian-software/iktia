import { describe, expect, it } from "vitest"

import {
  For,
  Show,
  component,
  computed,
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
    expect(() => component("x-test", () => ({ kind: "iktia.jsx" }))).toThrow(
      "Iktia component() can only be used"
    )
  })

  it("keeps authoring stubs compiler-only", () => {
    expect(() => prop.string("label", "Label")).toThrow("Iktia prop()")
    expect(() => state(false)).toThrow("Iktia state()")
    expect(() => signal(false)).toThrow("Iktia signal()")
    expect(() => computed(() => true)).toThrow("Iktia computed()")
    expect(() => effect(() => undefined)).toThrow("Iktia effect()")
    expect(() => Show({ when: true })).toThrow("Iktia Show()")
    expect(() => For({ each: [1], children: () => ({ kind: "iktia.jsx" }) })).toThrow(
      "Iktia For()"
    )
    expect(() => on("click", () => undefined)).toThrow("Iktia on()")
    expect(() => host()).toThrow("Iktia host()")
    expect(() => useHost()).toThrow("Iktia useHost()")
    expect(() => event<number>("change")).toThrow("Iktia event()")
  })
})
