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

type NativeTransformComponentRequest = {
  source: string
  filename: string
}

type NativeTransformComponentResult = {
  code: string
  hasChanged: boolean
}

type NativeBindings = {
  getNativeInfo(): NativeInfo
  transformComponent(request: NativeTransformComponentRequest): NativeTransformComponentResult
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

  const nativePath = fileURLToPath(new URL("../native/lean_wc_node.node", import.meta.url))
  if (!existsSync(nativePath)) {
    throw new Error(
      `lean-wc native binding was not found at ${nativePath}. Run \`pnpm build:native\` from the workspace root before using @lean-wc/core-node locally.`
    )
  }

  const require = createRequire(import.meta.url)
  loadedBindings = require(nativePath) as NativeBindings
  return loadedBindings
}
