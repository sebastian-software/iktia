import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"

import { transformComponent } from "@iktia/compiler"
import ts from "typescript"

const packageRoot = resolve(import.meta.dirname, "..")
const sourceRoot = join(packageRoot, "src")
const distRoot = join(packageRoot, "dist")

const components = [
  "accordion",
  "accordion-item",
  "button",
  "button-group",
  "checkbox",
  "collapsible",
  "combobox",
  "combobox-item",
  "context-menu",
  "dialog",
  "dropdown",
  "field",
  "hover-card",
  "listbox",
  "listbox-item",
  "menu",
  "menu-item",
  "number-input",
  "pin-input",
  "popover",
  "radio",
  "radio-group",
  "segmented-control",
  "segmented-item",
  "select",
  "select-item",
  "slider",
  "switch",
  "tab",
  "tab-panel",
  "tabs",
  "tags-input",
  "tooltip",
  "toggle",
  "toggle-group",
  "toggle-item",
]
const behaviorFiles = ["checkbox", "disclosure", "tabs", "toggle"]
const zagFiles = [
  "accordion",
  "checkbox",
  "collapsible",
  "combobox",
  "dialog",
  "hover-card",
  "listbox",
  "menu",
  "number-input",
  "pin-input",
  "popover",
  "props",
  "radio-group",
  "segmented-control",
  "select",
  "slider",
  "scope",
  "service",
  "switch",
  "tabs",
  "tags-input",
  "tooltip",
  "toggle",
  "toggle-group",
]

await rm(distRoot, { force: true, recursive: true })
await mkdir(distRoot, { recursive: true })

const exports = []

for (const component of components) {
  const filename = join(sourceRoot, `${component}.wc.tsx`)
  const source = await readFile(filename, "utf8")
  const transformed = transformComponent({ filename, source })
  const code = await inlineCssImports(transformed.code, filename)
  await writeFile(join(distRoot, `${component}.mjs`), `${code}\n`)
  await writeFile(join(distRoot, `${component}.d.mts`), declarationFor(component))
  exports.push(component)
}

await writeFile(
  join(distRoot, "index.mjs"),
  `${exports.map((name) => `export * from "./${name}.mjs"`).join("\n")}\n`
)
await writeFile(
  join(distRoot, "index.d.mts"),
  `${exports.map((name) => `export * from "./${name}.mjs"`).join("\n")}\n`
)

await buildBehaviorHelpers()
await buildZagHelpers()

async function inlineCssImports(code, filename) {
  const cssImport =
    /import\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+from\s+["']([^"']+\.css\?inline)["'];?/g
  const sideEffectCssImport = /import\s+["']([^"']+\.css\?inline)["'];?/g
  let output = code
  for (const match of code.matchAll(cssImport)) {
    const [statement, localName, source] = match
    const cssPath = join(dirname(filename), source.replace("?inline", ""))
    const css = await readFile(cssPath, "utf8")
    output = output.replace(statement, `const ${localName} = ${JSON.stringify(css)};`)
  }
  output = output.replace(sideEffectCssImport, "")
  return output
}

async function buildBehaviorHelpers() {
  const behaviorSourceRoot = join(sourceRoot, "internal", "behavior")
  const behaviorDistRoot = join(distRoot, "internal", "behavior")
  await mkdir(behaviorDistRoot, { recursive: true })

  for (const behavior of behaviorFiles) {
    await buildTypeScriptFile({
      distRoot: behaviorDistRoot,
      filename: `${behavior}.ts`,
      sourceRoot: behaviorSourceRoot,
    })
  }
}

async function buildZagHelpers() {
  const zagSourceRoot = join(sourceRoot, "internal", "zag")
  const zagDistRoot = join(distRoot, "internal", "zag")
  await mkdir(zagDistRoot, { recursive: true })

  for (const helper of zagFiles) {
    await buildTypeScriptFile({
      distRoot: zagDistRoot,
      filename: `${helper}.ts`,
      sourceRoot: zagSourceRoot,
    })
  }
}

async function buildTypeScriptFile({ distRoot, filename, sourceRoot }) {
  const source = await readFile(join(sourceRoot, filename), "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2023,
    },
    fileName: filename,
  })
  await writeFile(join(distRoot, filename.replace(/\.ts$/, ".js")), `${output.outputText}\n`)
}

function declarationFor(component) {
  const className = classNameFor(component)
  const tagName = `iktia-${component}`
  return `export declare class ${className} extends HTMLElement {}
export { ${className} as ${exportNameFor(component)} };
export default ${className};

declare global {
  interface HTMLElementTagNameMap {
    "${tagName}": ${className};
  }
}
`
}

function classNameFor(component) {
  return `${exportNameFor(component)}Element`
}

function exportNameFor(component) {
  return component
    .split("-")
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join("")
    .replace(/^/, "Iktia")
}
