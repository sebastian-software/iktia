import { setNativeBindingsForTesting } from "@iktia/compiler"
import { afterEach, describe, expect, it } from "vitest"

import { iktia } from "./vite.js"

describe("iktia", () => {
  afterEach(() => {
    setNativeBindingsForTesting(null)
  })

  it("passes through files outside the include filter", async () => {
    const plugin = iktia()
    const transform = plugin.transform
    if (typeof transform !== "function") {
      throw new Error("Expected transform hook")
    }

    const result = await transform.call(mockPluginContext(), "source", "/src/plain.ts")

    expect(result).toBeNull()
  })

  it("transforms wc tsx modules through the native wrapper", async () => {
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "test" }),
      renderDeclarativeShadowDom: () => ({
        className: "CounterElement",
        exportName: "Counter",
        html: "",
        shadow: true,
        tagName: "x-counter",
        templateHtml: "",
        usesDeclarativeShadowDom: true,
      }),
      transformComponent: (request) => ({
        code: `compiled:${request.filename}:${request.source}`,
        hasChanged: true,
      }),
    })

    const plugin = iktia()
    const transform = plugin.transform
    if (typeof transform !== "function") {
      throw new Error("Expected transform hook")
    }

    const result = await transform.call(mockPluginContext(), "source", "/src/counter.wc.tsx?raw")

    expect(result).toEqual({
      code: "compiled:/src/counter.wc.tsx:source",
      map: null,
    })
  })

  it("emits a DSD manifest only when prerendering is enabled", async () => {
    const emitted: unknown[] = []
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "test" }),
      renderDeclarativeShadowDom: () => ({
        className: "CounterElement",
        exportName: "Counter",
        html: "<x-counter></x-counter>",
        shadow: true,
        tagName: "x-counter",
        templateHtml: '<template shadowrootmode="open"></template>',
        usesDeclarativeShadowDom: true,
      }),
      transformComponent: () => ({
        code: "compiled",
        hasChanged: true,
      }),
    })

    const plugin = iktia({
      prerender: {
        manifestFile: "components.json",
      },
    })
    const transform = plugin.transform
    const generateBundle = plugin.generateBundle
    if (typeof transform !== "function" || typeof generateBundle !== "function") {
      throw new Error("Expected transform and generateBundle hooks")
    }

    await transform.call(mockPluginContext(), "source", "/src/counter.wc.tsx")
    await generateBundle.call(
      {
        emitFile(file: unknown) {
          emitted.push(file)
          return "asset-id"
        },
      } as never,
      {} as never,
      {} as never,
      false
    )

    expect(emitted).toEqual([
      {
        fileName: "components.json",
        source:
          '{\n  "components": [\n    {\n      "className": "CounterElement",\n      "clientModule": "/src/counter.wc.tsx",\n      "exportName": "Counter",\n      "importPath": "/src/counter.wc.tsx",\n      "shadow": true,\n      "tagName": "x-counter",\n      "usesDeclarativeShadowDom": true\n    }\n  ]\n}\n',
        type: "asset",
      },
    ])
  })
})

function mockPluginContext() {
  return {
    error(error: string): never {
      throw new Error(error)
    },
  } as never
}
