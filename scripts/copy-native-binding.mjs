import { copyFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const rootDir = dirname(fileURLToPath(new URL("../package.json", import.meta.url)))
const sourceByPlatform = {
  darwin: "libnaos_node.dylib",
  linux: "libnaos_node.so",
  win32: "naos_node.dll",
}

const sourceFileName = sourceByPlatform[process.platform]
if (!sourceFileName) {
  throw new Error(`Unsupported platform for local native binding copy: ${process.platform}`)
}

const sourcePath = join(rootDir, "target", "debug", sourceFileName)
const targetDir = join(rootDir, "packages", "compiler", "native")
const targetPath = join(targetDir, "naos-node.node")

mkdirSync(targetDir, { recursive: true })
copyFileSync(sourcePath, targetPath)
console.log(`Copied native binding to ${targetPath}`)
