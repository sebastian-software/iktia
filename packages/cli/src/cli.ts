#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises"
import { basename, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import {
  getNativeInfo,
  isNaosCompilerError,
  renderDeclarativeShadowDom,
  transformComponent,
  type NaosDiagnostic,
} from "@naos-ui/compiler"

export type CliIo = {
  cwd?: string
  stderr: { write(chunk: string): unknown }
  stdout: { write(chunk: string): unknown }
}

type ParsedArgs = {
  help: boolean
  input?: string
  json: boolean
  output?: string
  pretty: boolean
  props?: string
  stdout: boolean
}

const helpText = `Usage:
  naos compile <input> [-o output] [--stdout] [--json] [--pretty]
  naos prerender <input> [-o output] [--props json] [--json] [--pretty]
  naos info [--json] [--pretty]

Examples:
  naos compile src/counter.wc.tsx -o dist/counter.js
  naos compile src/counter.wc.tsx -o dist/counter.js --json
  naos prerender src/counter.wc.tsx --props '{"label":"Count"}' --stdout
  naos info --pretty
`

const compileHelpText = `Usage:
  naos compile <input> [-o output] [--stdout] [--json] [--pretty]

Compile one .wc.tsx module to JavaScript.

Options:
  -o, --out, --output <file>  Write JavaScript to a file.
  --stdout                   Print JavaScript to stdout instead of writing files.
  --json                     Print a deterministic JSON summary. Requires -o.
  --pretty                   Pretty-print JSON output.
  -h, --help                 Show this help.
`

const prerenderHelpText = `Usage:
  naos prerender <input> [-o output] [--props json] [--stdout] [--json] [--pretty]

Prerender one .wc.tsx module to host HTML with Declarative Shadow DOM.

Options:
  -o, --out, --output <file>  Write HTML to a file.
  --stdout                   Print HTML to stdout instead of writing files.
  --props <json>             JSON object used as initial prerender props.
  --json                     Print a deterministic JSON summary. Requires -o.
  --pretty                   Pretty-print JSON output.
  -h, --help                 Show this help.
`

const infoHelpText = `Usage:
  naos info [--json] [--pretty]

Print Node platform metadata and native compiler version metadata as JSON.

Options:
  --json     Print compact JSON. The default info output is pretty JSON.
  --pretty   Pretty-print JSON output. This is the default for info.
  -h, --help Show this help.
`

export async function runCli(
  argv = process.argv.slice(2),
  io: CliIo = {
    stderr: process.stderr,
    stdout: process.stdout,
  }
): Promise<number> {
  const cwd = io.cwd ?? process.cwd()
  const [command, ...args] = argv

  try {
    switch (command) {
      case "compile":
        return await compileCommand(args, cwd, io)
      case "prerender":
        return await prerenderCommand(args, cwd, io)
      case "info":
        return infoCommand(args, io)
      case "-h":
      case "--help":
      case undefined:
        io.stdout.write(helpText)
        return 0
      default:
        io.stderr.write(`Unknown Naos command: ${command}\n${helpText}`)
        return 1
    }
  } catch (error) {
    if (isNaosCompilerError(error)) {
      io.stderr.write(`${formatDiagnostics(error.diagnostics)}\n`)
      return 1
    }

    const message = error instanceof Error ? error.message : String(error)
    io.stderr.write(`${message}\n`)
    return 1
  }
}

async function compileCommand(
  args: readonly string[],
  cwd: string,
  io: CliIo
): Promise<number> {
  const parsed = parseArgs(args, { props: false })
  if (parsed.help) {
    io.stdout.write(compileHelpText)
    return 0
  }
  const input = requireInput(parsed, "compile")
  const filename = resolve(cwd, input)
  validateJsonSummaryMode(parsed, "compile")
  const source = await readInputFile(filename)
  const result = transformComponent({ filename, source })
  const outputPath = parsed.output ? resolve(cwd, parsed.output) : undefined

  if (outputPath && !parsed.stdout) {
    const code = result.map
      ? `${result.code}\n//# sourceMappingURL=${basename(outputPath)}.map\n`
      : result.code
    await writeFile(outputPath, code)
    let mapPath: string | null = null
    if (result.map) {
      mapPath = `${outputPath}.map`
      await writeFile(mapPath, `${JSON.stringify(result.map, null, 2)}\n`)
    }
    if (parsed.json) {
      writeJson(
        io,
        {
          command: "compile",
          hasChanged: result.hasChanged,
          input: filename,
          map: mapPath,
          output: outputPath,
        },
        parsed.pretty
      )
    }
    return 0
  }

  io.stdout.write(result.code)
  if (!result.code.endsWith("\n")) {
    io.stdout.write("\n")
  }
  return 0
}

async function prerenderCommand(
  args: readonly string[],
  cwd: string,
  io: CliIo
): Promise<number> {
  const parsed = parseArgs(args, { props: true })
  if (parsed.help) {
    io.stdout.write(prerenderHelpText)
    return 0
  }
  const input = requireInput(parsed, "prerender")
  const filename = resolve(cwd, input)
  validateJsonSummaryMode(parsed, "prerender")
  const source = await readInputFile(filename)
  const props = parsed.props ? parseProps(parsed.props) : undefined
  const inlineStyles = await resolveInlineStyles(source, filename)
  const result = renderDeclarativeShadowDom({
    filename,
    inlineStyles,
    props,
    source,
  })
  const outputPath = parsed.output ? resolve(cwd, parsed.output) : undefined

  if (outputPath && !parsed.stdout) {
    await writeFile(outputPath, `${result.html}\n`)
    if (parsed.json) {
      writeJson(
        io,
        {
          command: "prerender",
          input: filename,
          output: outputPath,
          shadow: result.shadow,
          tagName: result.tagName,
          usesDeclarativeShadowDom: result.usesDeclarativeShadowDom,
        },
        parsed.pretty
      )
    }
    return 0
  }

  io.stdout.write(`${result.html}\n`)
  return 0
}

function infoCommand(args: readonly string[], io: CliIo): number {
  const parsed = parseArgs(args, { props: false })
  if (parsed.help) {
    io.stdout.write(infoHelpText)
    return 0
  }
  if (parsed.input || parsed.output || parsed.stdout) {
    throw new Error("naos info does not accept input, output, or --stdout")
  }
  const native = getNativeInfo()
  writeJson(
    io,
    {
      arch: process.arch,
      native,
      node: process.versions.node,
      platform: process.platform,
    },
    parsed.pretty || !parsed.json
  )
  return 0
}

function parseArgs(
  args: readonly string[],
  options: { props: boolean }
): ParsedArgs {
  const parsed: ParsedArgs = { help: false, json: false, pretty: false, stdout: false }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "-h" || arg === "--help") {
      parsed.help = true
      continue
    }
    if (arg === "-o" || arg === "--out" || arg === "--output") {
      parsed.output = readOptionValue(args, index, arg)
      index += 1
      continue
    }
    if (arg === "--json") {
      parsed.json = true
      continue
    }
    if (arg === "--pretty") {
      parsed.pretty = true
      continue
    }
    if (arg === "--stdout") {
      parsed.stdout = true
      continue
    }
    if (arg === "--props" && options.props) {
      parsed.props = readOptionValue(args, index, arg)
      index += 1
      continue
    }
    if (arg?.startsWith("-")) {
      throw new Error(`Unsupported option: ${arg}`)
    }
    if (parsed.input) {
      throw new Error(`Unexpected extra input: ${arg}`)
    }
    parsed.input = arg
  }

  return parsed
}

async function readInputFile(filename: string): Promise<string> {
  try {
    return await readFile(filename, "utf8")
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new Error(`Input file not found: ${filename}`)
    }
    throw error
  }
}

function validateJsonSummaryMode(parsed: ParsedArgs, command: string): void {
  if (!parsed.json) {
    return
  }
  if (parsed.stdout) {
    throw new Error(`naos ${command} --json cannot be combined with --stdout`)
  }
  if (!parsed.output) {
    throw new Error(`naos ${command} --json requires -o or --output`)
  }
}

function writeJson(io: CliIo, value: unknown, pretty: boolean): void {
  io.stdout.write(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`)
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error
}

function readOptionValue(args: readonly string[], index: number, option: string): string {
  const value = args[index + 1]
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${option}`)
  }
  return value
}

function requireInput(parsed: ParsedArgs, command: string): string {
  if (!parsed.input) {
    throw new Error(`naos ${command} requires an input file`)
  }
  return parsed.input
}

function parseProps(source: string): Record<string, unknown> {
  const value = JSON.parse(source) as unknown
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("--props must be a JSON object")
  }
  return value as Record<string, unknown>
}

async function resolveInlineStyles(
  source: string,
  filename: string
): Promise<Record<string, string> | undefined> {
  const imports = inlineCssImports(source)
  if (imports.length === 0) {
    return undefined
  }

  const inlineStyles: Record<string, string> = {}
  for (const styleImport of imports) {
    const cssPath = resolve(dirname(filename), stripQuery(styleImport.source))
    inlineStyles[styleImport.localName] = await readFile(cssPath, "utf8")
  }
  return inlineStyles
}

type InlineCssImport = {
  localName: string
  source: string
}

function inlineCssImports(source: string): InlineCssImport[] {
  const imports: InlineCssImport[] = []
  const regex =
    /import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+["']([^"']+\.css\?inline(?:&[^"']*)?)["']/g
  for (const match of source.matchAll(regex)) {
    const [, localName, importSource] = match
    if (localName && importSource) {
      imports.push({ localName, source: importSource })
    }
  }
  return imports
}

function stripQuery(id: string): string {
  return id.split("?")[0] ?? id
}

function formatDiagnostics(diagnostics: readonly NaosDiagnostic[]): string {
  return diagnostics
    .map((diagnostic) => {
      const span = diagnostic.span
        ? `:${diagnostic.span.start}-${diagnostic.span.end}`
        : ""
      const hint = diagnostic.hint ? `\nhint: ${diagnostic.hint}` : ""
      return `${diagnostic.filename}${span} ${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}${hint}`
    })
    .join("\n")
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  runCli().then((exitCode) => {
    process.exitCode = exitCode
  })
}
