import type {
  NativeBindings,
  NativeDeclarativeShadowDomRequest,
  NativeDeclarativeShadowDomResult,
  NativeInfo as GeneratedNativeInfo,
  NativeSourceMap,
  NativeTransformRequest,
  NativeTransformResult,
} from "./generated/naos-node-types.js"
import {
  loadNativeBindings,
  setNativeBindingsForTesting,
} from "./native-loader.js"

export type NativeInfo = GeneratedNativeInfo
export type SourceMap = NativeSourceMap

export type NaosDiagnosticSeverity = "info" | "warning" | "error"

export type NaosDiagnosticSpan = {
  start: number
  end: number
}

export type NaosDiagnostic = {
  code: string
  severity: NaosDiagnosticSeverity
  message: string
  filename: string
  span?: NaosDiagnosticSpan | null
  hint?: string | null
}

export class NaosCompilerError extends Error {
  readonly diagnostics: NaosDiagnostic[]

  constructor(
    message: string,
    diagnostics: NaosDiagnostic[],
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = "NaosCompilerError"
    this.diagnostics = diagnostics
  }
}

export type TransformComponentRequest = {
  source: string
  filename: string
}

export type TransformComponentResult = NativeTransformResult

export type DeclarativeShadowDomProps = Record<string, unknown>

export type RenderDeclarativeShadowDomRequest = {
  source: string
  filename: string
  props?: DeclarativeShadowDomProps
  inlineStyles?: Record<string, string>
}

export type RenderDeclarativeShadowDomResult = NativeDeclarativeShadowDomResult
export type { NativeBindings, NativeDeclarativeShadowDomRequest, NativeTransformRequest }

export function getNativeInfo(): NativeInfo {
  return loadNativeBindings().getNativeInfo()
}

export function transformComponent(
  request: TransformComponentRequest
): TransformComponentResult {
  return withNativeDiagnostics(() => loadNativeBindings().transformComponent(request))
}

export function renderDeclarativeShadowDom(
  request: RenderDeclarativeShadowDomRequest
): RenderDeclarativeShadowDomResult {
  return withNativeDiagnostics(() =>
    loadNativeBindings().renderDeclarativeShadowDom({
      filename: request.filename,
      inlineStylesJson: request.inlineStyles
        ? JSON.stringify(request.inlineStyles)
        : undefined,
      propsJson: request.props ? JSON.stringify(request.props) : undefined,
      source: request.source,
    })
  )
}
export { setNativeBindingsForTesting }

export function isNaosCompilerError(error: unknown): error is NaosCompilerError {
  return error instanceof NaosCompilerError
}

const DIAGNOSTIC_REASON_PREFIX = "NAOS_COMPILER_DIAGNOSTICS:"

function withNativeDiagnostics<T>(operation: () => T): T {
  try {
    return operation()
  } catch (error) {
    throw normalizeNativeError(error)
  }
}

function normalizeNativeError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error)
  const markerIndex = message.indexOf(DIAGNOSTIC_REASON_PREFIX)
  if (markerIndex < 0) {
    return error instanceof Error ? error : new Error(message)
  }

  const payloadSource = message.slice(markerIndex + DIAGNOSTIC_REASON_PREFIX.length)
  const payload = parseDiagnosticPayload(payloadSource)
  if (!payload) {
    return error instanceof Error ? error : new Error(message)
  }

  return new NaosCompilerError(payload.message, payload.diagnostics, {
    cause: error,
  })
}

function parseDiagnosticPayload(
  source: string
): { message: string; diagnostics: NaosDiagnostic[] } | null {
  let payload: unknown
  try {
    payload = JSON.parse(source)
  } catch {
    return null
  }

  if (!isRecord(payload) || !Array.isArray(payload.diagnostics)) {
    return null
  }

  const diagnostics = payload.diagnostics.filter(isNaosDiagnostic)
  if (diagnostics.length === 0) {
    return null
  }

  return {
    diagnostics,
    message:
      typeof payload.message === "string"
        ? payload.message
        : diagnostics[0]?.message ?? "Naos compiler failed",
  }
}

function isNaosDiagnostic(value: unknown): value is NaosDiagnostic {
  if (!isRecord(value)) {
    return false
  }

  const severity = value.severity
  return (
    typeof value.code === "string" &&
    typeof value.filename === "string" &&
    typeof value.message === "string" &&
    (severity === "error" || severity === "warning" || severity === "info") &&
    (value.hint === undefined || value.hint === null || typeof value.hint === "string") &&
    (value.span === undefined || value.span === null || isNaosDiagnosticSpan(value.span))
  )
}

function isNaosDiagnosticSpan(value: unknown): value is NaosDiagnosticSpan {
  return (
    isRecord(value) &&
    typeof value.start === "number" &&
    Number.isInteger(value.start) &&
    typeof value.end === "number" &&
    Number.isInteger(value.end)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
