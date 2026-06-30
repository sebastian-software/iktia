import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { NaosCompilerError, setNativeBindingsForTesting } from "@naos-ui/compiler"
import { afterEach, describe, expect, it } from "vitest"

import { runCli, type CliIo } from "./cli.js"

function createIo(cwd?: string): CliIo & { stderrText(): string; stdoutText(): string } {
  let stdout = ""
  let stderr = ""
  return {
    cwd,
    stderr: {
      write(chunk: string) {
        stderr += chunk
      },
    },
    stderrText() {
      return stderr
    },
    stdout: {
      write(chunk: string) {
        stdout += chunk
      },
    },
    stdoutText() {
      return stdout
    },
  }
}

describe("@naos-ui/cli", () => {
  afterEach(() => {
    setNativeBindingsForTesting(null)
  })

  it("prints native info", async () => {
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "1.2.3" }),
      renderDeclarativeShadowDom: () => ({
        className: "CounterElement",
        html: "",
        shadow: true,
        tagName: "x-counter",
        templateHtml: "",
        usesDeclarativeShadowDom: true,
      }),
      transformComponent: () => ({ code: "", hasChanged: false }),
    })
    const io = createIo()

    await expect(runCli(["info"], io)).resolves.toBe(0)
    expect(JSON.parse(io.stdoutText())).toMatchObject({
      native: { coreVersion: "1.2.3" },
    })
  })

  it("prints compact native info with --json", async () => {
    setNativeBindingsForTesting({
      getNativeInfo: () => ({ coreVersion: "1.2.3" }),
      renderDeclarativeShadowDom: () => ({
        className: "CounterElement",
        html: "",
        shadow: true,
        tagName: "x-counter",
        templateHtml: "",
        usesDeclarativeShadowDom: true,
      }),
      transformComponent: () => ({ code: "", hasChanged: false }),
    })
    const io = createIo()

    await expect(runCli(["info", "--json"], io)).resolves.toBe(0)
    expect(io.stdoutText()).toBe(
      `${JSON.stringify({
        arch: process.arch,
        native: { coreVersion: "1.2.3" },
        node: process.versions.node,
        platform: process.platform,
      })}\n`
    )
  })

  it("prints command help", async () => {
    const io = createIo()

    await expect(runCli(["compile", "--help"], io)).resolves.toBe(0)
    expect(io.stdoutText()).toContain("naos compile <input>")
    expect(io.stdoutText()).toContain("--json")
    expect(io.stderrText()).toBe("")
  })

  it("compiles to stdout", async () => {
    const root = await mkdtemp(join(tmpdir(), "naos-cli-"))
    try {
      await writeFile(join(root, "counter.wc.tsx"), "source")
      setNativeBindingsForTesting({
        getNativeInfo: () => ({ coreVersion: "1.2.3" }),
        renderDeclarativeShadowDom: () => ({
          className: "CounterElement",
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
      const io = createIo(root)

      await expect(runCli(["compile", "counter.wc.tsx"], io)).resolves.toBe(0)
      expect(io.stdoutText()).toBe(`compiled:${join(root, "counter.wc.tsx")}:source\n`)
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it("writes compiled code and source maps to files", async () => {
    const root = await mkdtemp(join(tmpdir(), "naos-cli-"))
    try {
      await writeFile(join(root, "counter.wc.tsx"), "source")
      setNativeBindingsForTesting({
        getNativeInfo: () => ({ coreVersion: "1.2.3" }),
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
      const io = createIo(root)

      await expect(
        runCli(["compile", "counter.wc.tsx", "-o", "counter.js"], io)
      ).resolves.toBe(0)
      expect(await readFile(join(root, "counter.js"), "utf8")).toBe(
        "compiled\n//# sourceMappingURL=counter.js.map\n"
      )
      expect(JSON.parse(await readFile(join(root, "counter.js.map"), "utf8"))).toMatchObject({
        mappings: "AAAA",
        sourcesContent: ["source"],
        version: 3,
      })
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it("writes compile JSON summaries when output is file-backed", async () => {
    const root = await mkdtemp(join(tmpdir(), "naos-cli-"))
    try {
      await writeFile(join(root, "counter.wc.tsx"), "source")
      setNativeBindingsForTesting({
        getNativeInfo: () => ({ coreVersion: "1.2.3" }),
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
      const io = createIo(root)

      await expect(
        runCli(["compile", "counter.wc.tsx", "-o", "counter.js", "--json"], io)
      ).resolves.toBe(0)
      expect(JSON.parse(io.stdoutText())).toEqual({
        command: "compile",
        hasChanged: true,
        input: join(root, "counter.wc.tsx"),
        map: join(root, "counter.js.map"),
        output: join(root, "counter.js"),
      })
      expect(io.stderrText()).toBe("")
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it("prerenders with props and resolved inline styles", async () => {
    const root = await mkdtemp(join(tmpdir(), "naos-cli-"))
    try {
      await writeFile(
        join(root, "counter.wc.tsx"),
        'import css from "./counter.css?inline";\nexport const options = { styles: [css] }'
      )
      await writeFile(join(root, "counter.css"), ":host { display: block; }\n")
      let propsJson: string | undefined
      let inlineStylesJson: string | undefined

      setNativeBindingsForTesting({
        getNativeInfo: () => ({ coreVersion: "1.2.3" }),
        renderDeclarativeShadowDom: (request) => {
          propsJson = request.propsJson
          inlineStylesJson = request.inlineStylesJson
          return {
            className: "CounterElement",
            html: "<x-counter></x-counter>",
            shadow: true,
            tagName: "x-counter",
            templateHtml: '<template shadowrootmode="open"></template>',
            usesDeclarativeShadowDom: true,
          }
        },
        transformComponent: () => ({ code: "", hasChanged: false }),
      })
      const io = createIo(root)

      await expect(
        runCli([
          "prerender",
          "counter.wc.tsx",
          "--props",
          '{"label":"Count"}',
          "-o",
          "counter.html",
        ], io)
      ).resolves.toBe(0)
      expect(await readFile(join(root, "counter.html"), "utf8")).toBe(
        "<x-counter></x-counter>\n"
      )
      expect(propsJson).toBe('{"label":"Count"}')
      expect(inlineStylesJson).toBe('{"css":":host { display: block; }\\n"}')
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it("writes prerender JSON summaries when output is file-backed", async () => {
    const root = await mkdtemp(join(tmpdir(), "naos-cli-"))
    try {
      await writeFile(join(root, "counter.wc.tsx"), "source")

      setNativeBindingsForTesting({
        getNativeInfo: () => ({ coreVersion: "1.2.3" }),
        renderDeclarativeShadowDom: () => ({
          className: "CounterElement",
          html: "<x-counter></x-counter>",
          shadow: true,
          tagName: "x-counter",
          templateHtml: '<template shadowrootmode="open"></template>',
          usesDeclarativeShadowDom: true,
        }),
        transformComponent: () => ({ code: "", hasChanged: false }),
      })
      const io = createIo(root)

      await expect(
        runCli(["prerender", "counter.wc.tsx", "-o", "counter.html", "--json", "--pretty"], io)
      ).resolves.toBe(0)
      expect(JSON.parse(io.stdoutText())).toEqual({
        command: "prerender",
        input: join(root, "counter.wc.tsx"),
        output: join(root, "counter.html"),
        shadow: true,
        tagName: "x-counter",
        usesDeclarativeShadowDom: true,
      })
      expect(io.stdoutText()).toContain("\n  ")
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it("rejects JSON summaries when stdout carries generated output", async () => {
    const root = await mkdtemp(join(tmpdir(), "naos-cli-"))
    try {
      await writeFile(join(root, "counter.wc.tsx"), "source")
      setNativeBindingsForTesting({
        getNativeInfo: () => ({ coreVersion: "1.2.3" }),
        renderDeclarativeShadowDom: () => ({
          className: "CounterElement",
          html: "",
          shadow: true,
          tagName: "x-counter",
          templateHtml: "",
          usesDeclarativeShadowDom: true,
        }),
        transformComponent: () => ({ code: "compiled", hasChanged: true }),
      })
      const io = createIo(root)

      await expect(
        runCli(["compile", "counter.wc.tsx", "--stdout", "--json"], io)
      ).resolves.toBe(1)
      expect(io.stderrText()).toBe(
        "naos compile --json cannot be combined with --stdout\n"
      )
      expect(io.stdoutText()).toBe("")
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it("renders missing input files as stable CLI errors", async () => {
    const root = await mkdtemp(join(tmpdir(), "naos-cli-"))
    try {
      const io = createIo(root)

      await expect(runCli(["compile", "missing.wc.tsx"], io)).resolves.toBe(1)
      expect(io.stderrText()).toBe(`Input file not found: ${join(root, "missing.wc.tsx")}\n`)
      expect(io.stdoutText()).toBe("")
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  it("renders structured compiler diagnostics to stderr", async () => {
    const root = await mkdtemp(join(tmpdir(), "naos-cli-"))
    try {
      await writeFile(join(root, "counter.wc.tsx"), "source")
      setNativeBindingsForTesting({
        getNativeInfo: () => ({ coreVersion: "1.2.3" }),
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
              filename: "counter.wc.tsx",
              hint: "Use supported syntax.",
              message: "Unsupported JSX",
              severity: "error",
              span: { end: 12, start: 4 },
            },
          ])
        },
      })
      const io = createIo(root)

      await expect(runCli(["compile", "counter.wc.tsx"], io)).resolves.toBe(1)
      expect(io.stderrText()).toBe(
        "counter.wc.tsx:4-12 error NAOS_UNSUPPORTED_SYNTAX: Unsupported JSX\nhint: Use supported syntax.\n"
      )
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })
})
