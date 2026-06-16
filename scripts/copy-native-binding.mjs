import { copyFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = dirname(fileURLToPath(new URL("../package.json", import.meta.url)))
const sourceByPlatform = {
  darwin: "liblean_wc_node.dylib",
  linux: "liblean_wc_node.so",
  win32: "lean_wc_node.dll",
}

const sourceFileName = sourceByPlatform[process.platform]
if (!sourceFileName) {
  throw new Error(`Unsupported platform for local native binding copy: ${process.platform}`)
}

const sourcePath = join(rootDir, "target", "debug", sourceFileName)
const targetDir = join(rootDir, "packages", "core-node", "native")
const targetPath = join(targetDir, "lean_wc_node.node")

mkdirSync(targetDir, { recursive: true })
copyFileSync(sourcePath, targetPath)
console.log(`Copied native binding to ${targetPath}`)

