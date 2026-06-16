import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

export type NativeInfo = {
  coreVersion: string
}

export type TransformComponentRequest = {
  source: string
  filename: string
}

export type TransformComponentResult = {
  code: string
  hasChanged: boolean
}

export type DeclarativeShadowDomProps = Record<string, unknown>

export type RenderDeclarativeShadowDomRequest = {
  source: string
  filename: string
  props?: DeclarativeShadowDomProps
}

export type RenderDeclarativeShadowDomResult = {
  tagName: string
  className: string
  exportName?: string | null
  html: string
  templateHtml: string
  shadow: boolean
  usesDeclarativeShadowDom: boolean
}

type NativeTransformComponentRequest = {
  source: string
  filename: string
}

type NativeTransformComponentResult = {
  code: string
  hasChanged: boolean
}

type NativeDeclarativeShadowDomRequest = {
  source: string
  filename: string
  propsJson?: string
}

type NativeBindings = {
  getNativeInfo(): NativeInfo
  transformComponent(request: NativeTransformComponentRequest): NativeTransformComponentResult
  renderDeclarativeShadowDom(
    request: NativeDeclarativeShadowDomRequest
  ): RenderDeclarativeShadowDomResult
}

let loadedBindings: NativeBindings | null = null
let testBindings: NativeBindings | null = null

export function getNativeInfo(): NativeInfo {
  return loadNativeBindings().getNativeInfo()
}

export function transformComponent(
  request: TransformComponentRequest
): TransformComponentResult {
  return loadNativeBindings().transformComponent(request)
}

export function renderDeclarativeShadowDom(
  request: RenderDeclarativeShadowDomRequest
): RenderDeclarativeShadowDomResult {
  return loadNativeBindings().renderDeclarativeShadowDom({
    filename: request.filename,
    propsJson: request.props ? JSON.stringify(request.props) : undefined,
    source: request.source,
  })
}

export function setNativeBindingsForTesting(bindings: NativeBindings | null): void {
  testBindings = bindings
  loadedBindings = null
}

function loadNativeBindings(): NativeBindings {
  if (testBindings) {
    return testBindings
  }
  if (loadedBindings) {
    return loadedBindings
  }

  const nativePath = fileURLToPath(new URL("../native/iktia_node.node", import.meta.url))
  if (!existsSync(nativePath)) {
    throw new Error(
      `Iktia native binding was not found at ${nativePath}. Run \`pnpm build:native\` from the workspace root before using @iktia/compiler locally.`
    )
  }

  const require = createRequire(import.meta.url)
  loadedBindings = require(nativePath) as NativeBindings
  return loadedBindings
}
