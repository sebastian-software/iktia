import { existsSync } from "node:fs"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

import type { NativeBindings } from "./generated/naos-node-types.js"

export const NATIVE_BINDING_ENV = "NAOS_NATIVE_BINDING_PATH"

export type LinuxLibc = "gnu" | "musl"

export type NativeTarget = {
  readonly arch: string
  readonly libc?: LinuxLibc
  readonly nodeArch: string
  readonly nodePlatform: string
  readonly packageName: string
  readonly rustTarget: string
}

export const NATIVE_TARGETS: readonly NativeTarget[] = [
  {
    arch: "arm64",
    nodeArch: "arm64",
    nodePlatform: "darwin",
    packageName: "@naos-ui/compiler-darwin-arm64",
    rustTarget: "aarch64-apple-darwin",
  },
  {
    arch: "x64",
    nodeArch: "x64",
    nodePlatform: "darwin",
    packageName: "@naos-ui/compiler-darwin-x64",
    rustTarget: "x86_64-apple-darwin",
  },
  {
    arch: "arm64",
    libc: "gnu",
    nodeArch: "arm64",
    nodePlatform: "linux",
    packageName: "@naos-ui/compiler-linux-arm64-gnu",
    rustTarget: "aarch64-unknown-linux-gnu",
  },
  {
    arch: "arm64",
    libc: "musl",
    nodeArch: "arm64",
    nodePlatform: "linux",
    packageName: "@naos-ui/compiler-linux-arm64-musl",
    rustTarget: "aarch64-unknown-linux-musl",
  },
  {
    arch: "x64",
    libc: "gnu",
    nodeArch: "x64",
    nodePlatform: "linux",
    packageName: "@naos-ui/compiler-linux-x64-gnu",
    rustTarget: "x86_64-unknown-linux-gnu",
  },
  {
    arch: "x64",
    libc: "musl",
    nodeArch: "x64",
    nodePlatform: "linux",
    packageName: "@naos-ui/compiler-linux-x64-musl",
    rustTarget: "x86_64-unknown-linux-musl",
  },
  {
    arch: "arm64",
    nodeArch: "arm64",
    nodePlatform: "win32",
    packageName: "@naos-ui/compiler-win32-arm64-msvc",
    rustTarget: "aarch64-pc-windows-msvc",
  },
  {
    arch: "x64",
    nodeArch: "x64",
    nodePlatform: "win32",
    packageName: "@naos-ui/compiler-win32-x64-msvc",
    rustTarget: "x86_64-pc-windows-msvc",
  },
] as const

type NativeProcessReport = {
  readonly header?: {
    readonly glibcVersionRuntime?: string
  }
}

type NativeLoaderContext = {
  readonly arch?: string
  readonly bindingExists?: (path: string) => boolean
  readonly env?: Partial<Record<string, string | undefined>>
  readonly importMetaUrl?: string
  readonly platform?: string
  readonly report?: NativeProcessReport
  readonly requireBinding?: (specifier: string) => NativeBindings
}

let loadedBindings: NativeBindings | null = null
let testBindings: NativeBindings | null = null

export function detectLinuxLibc(report?: NativeProcessReport): LinuxLibc {
  const glibcVersion = report?.header?.glibcVersionRuntime

  if (typeof glibcVersion === "string" && glibcVersion.length > 0) {
    return "gnu"
  }

  return "musl"
}

export function resolveNativeTarget(options: {
  readonly arch: string
  readonly libc?: LinuxLibc
  readonly platform: string
}): NativeTarget | null {
  const libc = options.platform === "linux" ? options.libc : undefined

  return (
    NATIVE_TARGETS.find(
      (target) =>
        target.nodePlatform === options.platform &&
        target.nodeArch === options.arch &&
        target.libc === libc
    ) ?? null
  )
}

export function localNativeBindingPath(importMetaUrl = import.meta.url): string {
  return fileURLToPath(new URL("../native/naos-node.node", importMetaUrl))
}

export function setNativeBindingsForTesting(bindings: NativeBindings | null): void {
  testBindings = bindings
  loadedBindings = null
}

export function loadNativeBindings(): NativeBindings {
  if (testBindings) {
    return testBindings
  }
  if (loadedBindings) {
    return loadedBindings
  }

  loadedBindings = loadNativeBindingsWithContext()
  return loadedBindings
}

export function loadNativeBindingsWithContext(
  context: NativeLoaderContext = {}
): NativeBindings {
  const env = context.env ?? process.env
  const platform = context.platform ?? process.platform
  const arch = context.arch ?? process.arch
  const report =
    context.report ??
    (process.report?.getReport?.() as NativeProcessReport | undefined)
  const requireBinding =
    context.requireBinding ?? createRequire(context.importMetaUrl ?? import.meta.url)
  const bindingExists = context.bindingExists ?? existsSync
  const explicitBindingPath = env[NATIVE_BINDING_ENV]

  if (explicitBindingPath && explicitBindingPath.length > 0) {
    return requireBinding(explicitBindingPath)
  }

  const libc = platform === "linux" ? detectLinuxLibc(report) : undefined
  const target = resolveNativeTarget({ arch, libc, platform })

  if (!target) {
    throw new Error(
      [
        `No Naos native compiler package is available for ${formatRuntimeTarget({
          arch,
          libc,
          platform,
        })}.`,
        `Supported native packages: ${supportedPackageList()}.`,
        sourceBuildGuidance(),
      ].join(" ")
    )
  }

  let packageError: unknown
  try {
    return requireBinding(target.packageName)
  } catch (error) {
    packageError = error
  }

  const localBindingPath = localNativeBindingPath(context.importMetaUrl)
  if (bindingExists(localBindingPath)) {
    return requireBinding(localBindingPath)
  }

  throw new Error(
    [
      `Failed to load Naos native compiler binding for ${target.rustTarget}.`,
      `Attempted optional package: ${target.packageName}.`,
      `Attempted workspace binding: ${localBindingPath}.`,
      `Supported native packages: ${supportedPackageList()}.`,
      `Original package load error: ${formatUnknownError(packageError)}.`,
      sourceBuildGuidance(),
    ].join(" ")
  )
}

function formatRuntimeTarget(options: {
  readonly arch: string
  readonly libc?: LinuxLibc
  readonly platform: string
}): string {
  if (options.platform === "linux") {
    return `${options.platform}/${options.arch}/${options.libc ?? "unknown-libc"}`
  }

  return `${options.platform}/${options.arch}`
}

function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function sourceBuildGuidance(): string {
  return `For repository development, run \`pnpm -w build:native\`; npm installs do not build native code from source. Use ${NATIVE_BINDING_ENV} for explicit local diagnostics.`
}

function supportedPackageList(): string {
  return NATIVE_TARGETS.map((target) => target.packageName).join(", ")
}
