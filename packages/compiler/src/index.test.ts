import { afterEach, describe, expect, it } from "vitest"

import {
  getNativeInfo,
  NaosCompilerError,
  renderDeclarativeShadowDom,
  setNativeBindingsForTesting,
  transformComponent,
} from "./index.js"

describe("@naos-ui/compiler wrapper", () => {
  afterEach(() => {
    setNativeBindingsForTesting(null)
  })

  it("forwards native info requests to the binding", () => {
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "1.2.3" }),
      transformComponent: () => ({ code: "", hasChanged: false }),
      renderDeclarativeShadowDom: () => ({
        className: "CounterElement",
        exportName: "Counter",
        html: "",
        shadow: true,
        tagName: "x-counter",
        templateHtml: "",
        usesDeclarativeShadowDom: true,
      }),
    })

    expect(getNativeInfo()).toEqual({ coreVersion: "1.2.3" })
  })

  it("forwards transform requests to the binding", () => {
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "1.2.3" }),
      transformComponent: (request) => ({
        code: `compiled:${request.filename}:${request.source.length}`,
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
      renderDeclarativeShadowDom: () => ({
        className: "CounterElement",
        exportName: "Counter",
        html: "",
        shadow: true,
        tagName: "x-counter",
        templateHtml: "",
        usesDeclarativeShadowDom: true,
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
      map: {
        file: "counter.wc.tsx",
        mappings: "AAAA",
        names: [],
        sources: ["counter.wc.tsx"],
        sourcesContent: ["source"],
        version: 3,
      },
    })
  })

  it("throws structured compiler errors from native diagnostic payloads", () => {
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "1.2.3" }),
      transformComponent: () => {
        throw new Error(
          'NAOS_COMPILER_DIAGNOSTICS:{"message":"Unsupported JSX","diagnostics":[{"code":"NAOS_UNSUPPORTED_SYNTAX","severity":"error","message":"Unsupported JSX","filename":"counter.wc.tsx","span":null,"hint":"Use supported syntax."}]}'
        )
      },
      renderDeclarativeShadowDom: () => ({
        className: "CounterElement",
        exportName: "Counter",
        html: "",
        shadow: true,
        tagName: "x-counter",
        templateHtml: "",
        usesDeclarativeShadowDom: true,
      }),
    })

    expect(() =>
      transformComponent({
        filename: "counter.wc.tsx",
        source: "source",
      })
    ).toThrow(NaosCompilerError)

    try {
      transformComponent({
        filename: "counter.wc.tsx",
        source: "source",
      })
    } catch (error) {
      expect(error).toBeInstanceOf(NaosCompilerError)
      expect((error as NaosCompilerError).diagnostics).toEqual([
        {
          code: "NAOS_UNSUPPORTED_SYNTAX",
          filename: "counter.wc.tsx",
          hint: "Use supported syntax.",
          message: "Unsupported JSX",
          severity: "error",
          span: null,
        },
      ])
    }
  })

  it("serializes prerender props and inline styles before forwarding DSD requests", () => {
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "1.2.3" }),
      transformComponent: () => ({ code: "", hasChanged: false }),
      renderDeclarativeShadowDom: (request) => ({
        className: "CounterElement",
        exportName: "Counter",
        html: `props:${request.propsJson};styles:${request.inlineStylesJson}`,
        shadow: true,
        tagName: "x-counter",
        templateHtml: "<template shadowrootmode=\"open\"></template>",
        usesDeclarativeShadowDom: true,
      }),
    })

    expect(
      renderDeclarativeShadowDom({
        filename: "counter.wc.tsx",
        inlineStyles: { css: ":host { display: block; }" },
        props: { label: "Count" },
        source: "source",
      })
    ).toEqual({
      className: "CounterElement",
      exportName: "Counter",
      html: 'props:{"label":"Count"};styles:{"css":":host { display: block; }"}',
      shadow: true,
      tagName: "x-counter",
      templateHtml: '<template shadowrootmode="open"></template>',
      usesDeclarativeShadowDom: true,
    })
  })
})
