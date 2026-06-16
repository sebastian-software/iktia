import { afterEach, describe, expect, it } from "vitest"

import {
  getNativeInfo,
  setNativeBindingsForTesting,
  transformComponent,
} from "./index.js"

describe("@lean-wc/core-node wrapper", () => {
  afterEach(() => {
    setNativeBindingsForTesting(null)
  })

  it("forwards native info requests to the binding", () => {
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "1.2.3" }),
      transformComponent: () => ({ code: "", hasChanged: false }),
    })

    expect(getNativeInfo()).toEqual({ coreVersion: "1.2.3" })
  })

  it("forwards transform requests to the binding", () => {
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "1.2.3" }),
      transformComponent: (request) => ({
        code: `compiled:${request.filename}:${request.source.length}`,
        hasChanged: true,
      }),
    })

    expect(
      transformComponent({
        filename: "counter.wc.tsx",
        source: "source",
      })
    ).toEqual({
      code: "compiled:counter.wc.tsx:6",
      hasChanged: true,
    })
  })
})

