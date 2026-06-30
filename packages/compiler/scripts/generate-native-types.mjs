import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const packageDir = path.resolve(scriptDir, "..")
const repoRoot = path.resolve(packageDir, "../..")
const outputPath = path.join(packageDir, "src/generated/naos-node-types.ts")
const mode = process.argv.includes("--check") ? "check" : "write"

function generateSource() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "naos-napi-types-"))

  try {
    execFileSync("cargo", ["build", "--package", "naos-node"], {
      cwd: repoRoot,
      env: {
        ...process.env,
        NAPI_TYPE_DEF_TMP_FOLDER: tempRoot,
      },
      stdio: "pipe",
    })

    const typeDefPath = path.join(tempRoot, "naos-node")
    const entries = readFileSync(typeDefPath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))

    const interfaces = []
    const methods = []

    for (const entry of entries) {
      if (entry.kind === "interface") {
        interfaces.push(renderInterface(entry.name, entry.def))
        continue
      }

      if (entry.kind === "string_enum") {
        interfaces.push(renderStringEnum(entry.name, entry.def))
        continue
      }

      if (entry.kind === "fn") {
        methods.push(renderMethod(entry.def))
      }
    }

    return [
      "// This file is generated from crates/naos-node via napi-rs typegen.",
      "// Do not edit by hand. Run `pnpm --filter @naos-ui/compiler generate-native-types`.",
      "",
      ...interfaces,
      "",
      "export interface NativeBindings {",
      ...methods,
      "}",
      "",
    ].join("\n")
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
}

function renderInterface(name, definition) {
  const body = String(definition)
    .replaceAll("\\n", "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("/**") || line.startsWith("*") || line.endsWith("*/")) {
        return `  ${line}`
      }
      return `  ${line};`
    })
    .join("\n")
  return `export interface ${name} {\n${body}\n}`
}

function renderMethod(definition) {
  const match = /^function\s+([^(]+)\((.*)\):\s*(.+)$/.exec(String(definition))
  if (!match) {
    throw new Error(`Unsupported function type definition: ${definition}`)
  }

  const [, name, args, returnType] = match
  return `  ${name}(${args}): ${returnType};`
}

function renderStringEnum(name, definition) {
  const members = String(definition)
    .split(",")
    .map((member) => member.trim())
    .filter(Boolean)
    .map((member) => {
      const match = /^[A-Za-z0-9_]+\s*=\s*'([^']+)'$/.exec(member)
      if (!match) {
        throw new Error(`Unsupported string enum definition: ${definition}`)
      }
      return JSON.stringify(match[1])
    })
  return `export type ${name} = ${members.join(" | ")}`
}

const source = generateSource()

if (mode === "check") {
  const existing = readFileSync(outputPath, "utf8")
  if (existing !== source) {
    console.error(
      "Generated native type declarations are out of date. Run `pnpm --filter @naos-ui/compiler generate-native-types`."
    )
    process.exit(1)
  }
  process.exit(0)
}

mkdirSync(path.dirname(outputPath), { recursive: true })
writeFileSync(outputPath, source)
