import { afterEach, describe, expect, it } from "vitest"

import {
  getNativeInfo,
  renderDeclarativeShadowDom,
  setNativeBindingsForTesting,
  transformComponent,
} from "./index.js"

describe("@iktia/compiler wrapper", () => {
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
    })
  })

  it("serializes prerender props before forwarding DSD requests", () => {
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "1.2.3" }),
      transformComponent: () => ({ code: "", hasChanged: false }),
      renderDeclarativeShadowDom: (request) => ({
        className: "CounterElement",
        exportName: "Counter",
        html: `props:${request.propsJson}`,
        shadow: true,
        tagName: "x-counter",
        templateHtml: "<template shadowrootmode=\"open\"></template>",
        usesDeclarativeShadowDom: true,
      }),
    })

    expect(
      renderDeclarativeShadowDom({
        filename: "counter.wc.tsx",
        props: { label: "Count" },
        source: "source",
      })
    ).toEqual({
      className: "CounterElement",
      exportName: "Counter",
      html: 'props:{"label":"Count"}',
      shadow: true,
      tagName: "x-counter",
      templateHtml: '<template shadowrootmode="open"></template>',
      usesDeclarativeShadowDom: true,
    })
  })
})
