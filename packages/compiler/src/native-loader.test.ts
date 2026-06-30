import { describe, expect, it } from "vitest"

import type { NativeBindings } from "./generated/naos-node-types.js"
import {
  detectLinuxLibc,
  loadNativeBindingsWithContext,
  localNativeBindingPath,
  NATIVE_BINDING_ENV,
  NATIVE_TARGETS,
  resolveNativeTarget,
} from "./native-loader.js"

function createBindings(): NativeBindings {
  return {
    getNativeInfo: () => ({ coreVersion: "0.0.0" }),
    renderDeclarativeShadowDom: () => ({
      className: "CounterElement",
      html: "",
      shadow: true,
      tagName: "x-counter",
      templateHtml: "",
      usesDeclarativeShadowDom: true,
    }),
    transformComponent: () => ({ code: "", hasChanged: false }),
  }
}

describe("native compiler loader", () => {
  it("maps the full tier-one target matrix to native package names", () => {
    expect(
      NATIVE_TARGETS.map((target) => [
        target.rustTarget,
        target.packageName,
      ])
    ).toEqual([
      ["aarch64-apple-darwin", "@naos-ui/compiler-darwin-arm64"],
      ["x86_64-apple-darwin", "@naos-ui/compiler-darwin-x64"],
      ["aarch64-unknown-linux-gnu", "@naos-ui/compiler-linux-arm64-gnu"],
      ["aarch64-unknown-linux-musl", "@naos-ui/compiler-linux-arm64-musl"],
      ["x86_64-unknown-linux-gnu", "@naos-ui/compiler-linux-x64-gnu"],
      ["x86_64-unknown-linux-musl", "@naos-ui/compiler-linux-x64-musl"],
      ["aarch64-pc-windows-msvc", "@naos-ui/compiler-win32-arm64-msvc"],
      ["x86_64-pc-windows-msvc", "@naos-ui/compiler-win32-x64-msvc"],
    ])
  })

  it("detects Linux libc from the Node process report", () => {
    expect(
      detectLinuxLibc({ header: { glibcVersionRuntime: "2.39" } })
    ).toBe("gnu")
    expect(detectLinuxLibc({ header: {} })).toBe("musl")
  })

  it("resolves Linux package names with libc as part of the target", () => {
    expect(
      resolveNativeTarget({
        arch: "x64",
        libc: "gnu",
        platform: "linux",
      })?.packageName
    ).toBe("@naos-ui/compiler-linux-x64-gnu")
    expect(
      resolveNativeTarget({
        arch: "x64",
        libc: "musl",
        platform: "linux",
      })?.packageName
    ).toBe("@naos-ui/compiler-linux-x64-musl")
  })

  it("uses an explicit native binding path before package resolution", () => {
    const bindings = createBindings()
    const loaded = loadNativeBindingsWithContext({
      env: { [NATIVE_BINDING_ENV]: "/tmp/custom-naos.node" },
      requireBinding: (specifier) => {
        expect(specifier).toBe("/tmp/custom-naos.node")
        return bindings
      },
    })

    expect(loaded).toBe(bindings)
  })

  it("loads the selected optional package when it is available", () => {
    const bindings = createBindings()
    const attempts: string[] = []

    const loaded = loadNativeBindingsWithContext({
      arch: "arm64",
      platform: "darwin",
      requireBinding: (specifier) => {
        attempts.push(specifier)
        return bindings
      },
    })

    expect(loaded).toBe(bindings)
    expect(attempts).toEqual(["@naos-ui/compiler-darwin-arm64"])
  })

  it("falls back to the workspace local binding after an optional package miss", () => {
    const bindings = createBindings()
    const attempts: string[] = []
    const importMetaUrl = "file:///repo/packages/compiler/src/native-loader.ts"
    const localBinding = localNativeBindingPath(importMetaUrl)

    const loaded = loadNativeBindingsWithContext({
      arch: "x64",
      bindingExists: (path) => path === localBinding,
      importMetaUrl,
      platform: "darwin",
      requireBinding: (specifier) => {
        attempts.push(specifier)
        if (specifier === localBinding) {
          return bindings
        }
        throw new Error("optional package not installed")
      },
    })

    expect(loaded).toBe(bindings)
    expect(attempts).toEqual(["@naos-ui/compiler-darwin-x64", localBinding])
  })

  it("reports unsupported platforms with the supported package list", () => {
    expect(() =>
      loadNativeBindingsWithContext({
        arch: "x64",
        platform: "freebsd",
      })
    ).toThrow(
      /No Naos native compiler package is available for freebsd\/x64.*@naos-ui\/compiler-darwin-arm64/s
    )
  })

  it("reports missing optional packages with target and source-build guidance", () => {
    expect(() =>
      loadNativeBindingsWithContext({
        arch: "x64",
        bindingExists: () => false,
        platform: "linux",
        report: { header: { glibcVersionRuntime: "2.39" } },
        requireBinding: () => {
          throw new Error("Cannot find module")
        },
      })
    ).toThrow(
      /x86_64-unknown-linux-gnu.*@naos-ui\/compiler-linux-x64-gnu.*pnpm -w build:native/s
    )
  })
})
