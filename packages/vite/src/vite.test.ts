import { NaosCompilerError, setNativeBindingsForTesting } from "@naos-ui/compiler"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { naos } from "./vite.js"

describe("naos", () => {
  afterEach(() => {
    setNativeBindingsForTesting(null)
  })

  it("passes through files outside the include filter", async () => {
    const plugin = naos()
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

    const plugin = naos()
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

  it("passes native source maps through to Vite", async () => {
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "test" }),
      renderDeclarativeShadowDom: () => ({
        className: "CounterElement",
        html: "",
        shadow: true,
        tagName: "x-counter",
        templateHtml: "",
        usesDeclarativeShadowDom: true,
      }),
      transformComponent: (request) => ({
        code: "compiled",
        hasChanged: true,
        map: {
          file: request.filename,
          mappings: "AAAA",
          names: [],
          sources: [request.filename],
          sourcesContent: [request.source],
          version: 3,
        },
      }),
    })

    const plugin = naos()
    const transform = plugin.transform
    if (typeof transform !== "function") {
      throw new Error("Expected transform hook")
    }

    const result = await transform.call(mockPluginContext(), "source", "/src/counter.wc.tsx")

    expect(result).toEqual({
      code: "compiled",
      map: {
        file: "/src/counter.wc.tsx",
        mappings: "AAAA",
        names: [],
        sources: ["/src/counter.wc.tsx"],
        sourcesContent: ["source"],
        version: 3,
      },
    })
  })

  it("renders structured diagnostics through the Vite error channel", async () => {
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "test" }),
      renderDeclarativeShadowDom: () => ({
        className: "CounterElement",
        html: "",
        shadow: true,
        tagName: "x-counter",
        templateHtml: "",
        usesDeclarativeShadowDom: true,
      }),
      transformComponent: () => {
        throw new NaosCompilerError("Unsupported JSX", [
          {
            code: "NAOS_UNSUPPORTED_SYNTAX",
            filename: "/src/counter.wc.tsx",
            hint: "Use supported syntax.",
            message: "Unsupported JSX",
            severity: "error",
            span: { end: 12, start: 4 },
          },
        ])
      },
    })

    const plugin = naos()
    const transform = plugin.transform
    if (typeof transform !== "function") {
      throw new Error("Expected transform hook")
    }

    await expect(
      transform.call(mockPluginContext(), "source", "/src/counter.wc.tsx")
    ).rejects.toThrow(
      "/src/counter.wc.tsx:4-12 error NAOS_UNSUPPORTED_SYNTAX: Unsupported JSX\nhint: Use supported syntax."
    )
  })

  it("emits a DSD manifest by default", async () => {
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

    const plugin = naos()
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
        fileName: "naos-manifest.json",
        source:
          '{\n  "components": [\n    {\n      "className": "CounterElement",\n      "clientModule": "/src/counter.wc.tsx",\n      "exportName": "Counter",\n      "importPath": "/src/counter.wc.tsx",\n      "shadow": true,\n      "tagName": "x-counter",\n      "usesDeclarativeShadowDom": true\n    }\n  ]\n}\n',
        type: "asset",
      },
    ])
  })

  it("does not prerender when prerendering is disabled", async () => {
    const emitted: unknown[] = []
    let prerenderCalls = 0
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "test" }),
      renderDeclarativeShadowDom: () => {
        prerenderCalls += 1
        return {
          className: "CounterElement",
          html: "",
          shadow: true,
          tagName: "x-counter",
          templateHtml: "",
          usesDeclarativeShadowDom: true,
        }
      },
      transformComponent: () => ({
        code: "compiled",
        hasChanged: true,
      }),
    })

    const plugin = naos({ prerender: false })
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

    expect(prerenderCalls).toBe(0)
    expect(emitted).toEqual([])
  })

  it("passes resolved inline CSS imports to DSD prerendering", async () => {
    const root = await mkdtemp(join(tmpdir(), "naos-vite-"))
    try {
      const filename = join(root, "counter.wc.tsx")
      await writeFile(join(root, "counter.css"), ":host { display: block; }\n")
      let inlineStylesJson: string | undefined

      setNativeBindingsForTesting({
        getNativeInfo: () => ({ coreVersion: "test" }),
        renderDeclarativeShadowDom: (request) => {
          inlineStylesJson = request.inlineStylesJson
          return {
            className: "CounterElement",
            exportName: "Counter",
            html: "<x-counter></x-counter>",
            shadow: true,
            tagName: "x-counter",
            templateHtml: '<template shadowrootmode="open"></template>',
            usesDeclarativeShadowDom: true,
          }
        },
        transformComponent: () => ({
          code: "compiled",
          hasChanged: true,
        }),
      })

      const plugin = naos()
      const transform = plugin.transform
      if (typeof transform !== "function") {
        throw new Error("Expected transform hook")
      }

      await transform.call(
        mockPluginContext(),
        'import css from "./counter.css?inline";\nexport const options = { styles: [css] }',
        filename
      )

      expect(inlineStylesJson).toBe('{"css":":host { display: block; }\\n"}')
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })
})

function mockPluginContext() {
  return {
    error(error: string): never {
      throw new Error(error)
    },
  } as never
}
