import { readFileSync } from "node:fs"
import { join } from "node:path"

const publicPackages = [
  "packages/core",
  "packages/data",
  "packages/data-convex",
  "packages/motion",
  "packages/runtime",
  "packages/primitives",
  "packages/router",
  "packages/compiler",
  "packages/vite",
  "packages/cli",
  "packages/compiler-darwin-arm64",
  "packages/compiler-darwin-x64",
  "packages/compiler-linux-arm64-gnu",
  "packages/compiler-linux-arm64-musl",
  "packages/compiler-linux-x64-gnu",
  "packages/compiler-linux-x64-musl",
  "packages/compiler-win32-arm64-msvc",
  "packages/compiler-win32-x64-msvc",
]

const jsPackages = [
  "packages/core",
  "packages/data",
  "packages/data-convex",
  "packages/motion",
  "packages/runtime",
  "packages/primitives",
  "packages/router",
  "packages/compiler",
  "packages/vite",
  "packages/cli",
]

const nativeTargets = [
  {
    cpu: "arm64",
    name: "@naos-ui/compiler-darwin-arm64",
    os: "darwin",
    path: "packages/compiler-darwin-arm64",
  },
  {
    cpu: "x64",
    name: "@naos-ui/compiler-darwin-x64",
    os: "darwin",
    path: "packages/compiler-darwin-x64",
  },
  {
    cpu: "arm64",
    libc: "glibc",
    name: "@naos-ui/compiler-linux-arm64-gnu",
    os: "linux",
    path: "packages/compiler-linux-arm64-gnu",
  },
  {
    cpu: "arm64",
    libc: "musl",
    name: "@naos-ui/compiler-linux-arm64-musl",
    os: "linux",
    path: "packages/compiler-linux-arm64-musl",
  },
  {
    cpu: "x64",
    libc: "glibc",
    name: "@naos-ui/compiler-linux-x64-gnu",
    os: "linux",
    path: "packages/compiler-linux-x64-gnu",
  },
  {
    cpu: "x64",
    libc: "musl",
    name: "@naos-ui/compiler-linux-x64-musl",
    os: "linux",
    path: "packages/compiler-linux-x64-musl",
  },
  {
    cpu: "arm64",
    name: "@naos-ui/compiler-win32-arm64-msvc",
    os: "win32",
    path: "packages/compiler-win32-arm64-msvc",
  },
  {
    cpu: "x64",
    name: "@naos-ui/compiler-win32-x64-msvc",
    os: "win32",
    path: "packages/compiler-win32-x64-msvc",
  },
]

const errors = []
const packageJsonByPath = new Map(
  publicPackages.map((packagePath) => [packagePath, readJson(join(packagePath, "package.json"))])
)
const expectedVersion = packageJsonByPath.get("packages/core")?.version

for (const packagePath of publicPackages) {
  const packageJson = packageJsonByPath.get(packagePath)
  check(packageJson?.version === expectedVersion, `${packagePath} version must be ${expectedVersion}`)
  check(packageJson?.license === "Apache-2.0", `${packagePath} must use Apache-2.0`)
  check(packageJson?.engines?.node === ">=22.0.0", `${packagePath} must require Node 22+`)
  check(packageJson?.publishConfig?.access === "public", `${packagePath} must publish publicly`)
  check(
    packageJson?.repository?.url === "git+https://github.com/sebastian-software/naos-ui.git",
    `${packagePath} repository must point at the GitHub repository`
  )
  check(packageJson?.repository?.directory === packagePath, `${packagePath} repository directory must match`)
  check(packageJson?.bugs === "https://github.com/sebastian-software/naos-ui/issues", `${packagePath} bugs URL must match`)
}

for (const packagePath of jsPackages) {
  const packageJson = packageJsonByPath.get(packagePath)
  if (packagePath === "packages/primitives") {
    check(
      packageJson?.scripts?.build === "node scripts/build-primitives.mjs",
      `${packagePath} must build with the primitives compiler script`
    )
  } else {
    check(packageJson?.scripts?.build === "tsdown", `${packagePath} must build with tsdown`)
  }
  check(packageJson?.files?.includes("dist/"), `${packagePath} must publish dist files`)
  check(
    typeof packageJson?.types === "string" &&
      packageJson.types.startsWith("./dist/") &&
      packageJson.types.endsWith(".d.mts"),
    `${packagePath} package-level types must point at dist .d.mts`
  )
  checkExportTypes(packageJson?.exports, packagePath)
}

const compilerPackage = packageJsonByPath.get("packages/compiler")
const optionalDependencyNames = Object.keys(compilerPackage?.optionalDependencies ?? {}).sort()
check(
  arrayEquals(optionalDependencyNames, nativeTargets.map((target) => target.name).sort()),
  "@naos-ui/compiler optionalDependencies must match native package matrix"
)

for (const target of nativeTargets) {
  const packageJson = packageJsonByPath.get(target.path)
  check(packageJson?.name === target.name, `${target.path} package name must be ${target.name}`)
  check(packageJson?.type === "commonjs", `${target.name} must be CommonJS`)
  check(packageJson?.main === "./naos-node.node", `${target.name} main must point at the .node artifact`)
  check(packageJson?.os?.[0] === target.os, `${target.name} os metadata must be ${target.os}`)
  check(packageJson?.cpu?.[0] === target.cpu, `${target.name} cpu metadata must be ${target.cpu}`)
  if (target.libc) {
    check(packageJson?.libc?.[0] === target.libc, `${target.name} libc metadata must be ${target.libc}`)
  }
}

const cargoToml = readText("Cargo.toml")
check(cargoToml.includes('version = "0.0.0"'), "workspace Cargo version must stay aligned")
check(readText("crates/naos-core/Cargo.toml").includes("publish = false"), "naos-core must remain unpublished")
check(readText("crates/naos-node/Cargo.toml").includes("publish = false"), "naos-node must remain unpublished")
check(readText(".npmrc").includes("provenance=true"), ".npmrc must enable npm provenance")

const releasePlease = readJson("release-please-config.json")
const releasePleasePackages = Object.keys(releasePlease.packages ?? {}).sort()
check(
  arrayEquals(releasePleasePackages, publicPackages.sort()),
  "release-please packages must match the public release set"
)

const releaseWorkflow = readText(".github/workflows/release.yml")
check(releaseWorkflow.includes("node-version: 22.18.0"), "release workflow must use Node 22.18.0")
check(releaseWorkflow.includes("package-manager-cache: false"), "release workflow must disable package-manager cache")
check(releaseWorkflow.includes("id-token: write"), "release workflow must allow npm OIDC")
for (const target of nativeTargets) {
  check(
    releaseWorkflow.includes(target.name) && releaseWorkflow.includes(target.path),
    `release workflow must include ${target.name}`
  )
}

const manifest = readJson(".release-please-manifest.json")
for (const packagePath of publicPackages) {
  check(manifest[packagePath] === expectedVersion, `${packagePath} release manifest version must be ${expectedVersion}`)
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`release-set: ${error}`)
  }
  process.exit(1)
}

function readJson(path) {
  return JSON.parse(readText(path))
}

function readText(path) {
  return readFileSync(path, "utf8")
}

function check(condition, message) {
  if (!condition) {
    errors.push(message)
  }
}

function arrayEquals(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function checkExportTypes(exports, packagePath) {
  if (!exports || typeof exports !== "object") {
    errors.push(`${packagePath} must define exports`)
    return
  }

  for (const [exportName, exportValue] of Object.entries(exports)) {
    if (!exportValue || typeof exportValue !== "object" || Array.isArray(exportValue)) {
      errors.push(`${packagePath} export ${exportName} must be an object`)
      continue
    }

    const types = exportValue.types
    check(
      typeof types === "string" && types.startsWith("./dist/") && types.endsWith(".d.mts"),
      `${packagePath} export ${exportName} types must point at dist .d.mts`
    )
  }
}
