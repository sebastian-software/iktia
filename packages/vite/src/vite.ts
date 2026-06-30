import { readFile } from "node:fs/promises"
import { dirname, isAbsolute, relative, resolve } from "node:path"

import {
  isNaosCompilerError,
  renderDeclarativeShadowDom,
  transformComponent,
  type NaosDiagnostic,
  type RenderDeclarativeShadowDomRequest,
  type RenderDeclarativeShadowDomResult,
} from "@naos-ui/compiler"
import { createFilter, type FilterPattern, type Plugin } from "vite"

export type NaosVitePluginOptions = {
  include?: FilterPattern
  exclude?: FilterPattern
  prerender?: boolean | NaosDeclarativeShadowDomPrerenderOptions
}

export type NaosDeclarativeShadowDomPrerenderOptions = {
  include?: FilterPattern
  exclude?: FilterPattern
  manifestFile?: string | false
}

export type NaosDeclarativeShadowDomManifestEntry = {
  tagName: string
  className: string
  exportName?: string | null
  importPath: string
  clientModule: string
  shadow: boolean
  usesDeclarativeShadowDom: boolean
}

export type NaosDeclarativeShadowDomManifest = {
  components: NaosDeclarativeShadowDomManifestEntry[]
}

export function naos(options: NaosVitePluginOptions = {}): Plugin {
  const filter = createFilter(options.include ?? /\.wc\.tsx$/, options.exclude ?? /node_modules/)
  const prerenderOptions = normalizePrerenderOptions(options.prerender)
  const prerenderFilter = prerenderOptions
    ? createFilter(
        prerenderOptions.include ?? options.include ?? /\.wc\.tsx$/,
        prerenderOptions.exclude ?? options.exclude ?? /node_modules/
      )
    : null
  const manifest = new Map<string, NaosDeclarativeShadowDomManifestEntry>()

  return {
    name: "naos:transform",
    enforce: "pre",
    async transform(code, id) {
      const filename = stripQuery(id)
      if (!filter(filename)) {
        return null
      }

      try {
        const result = transformComponent({
          filename,
          source: code,
        })

        if (!result.hasChanged) {
          return null
        }

        if (prerenderFilter?.(filename)) {
          const inlineStyles = await resolveInlineStyles(code, filename)
          const prerendered = renderNaosDeclarativeShadowDom({
            filename,
            inlineStyles,
            source: code,
          })
          const manifestPath = manifestComponentPath(filename)
          manifest.set(filename, {
            className: prerendered.className,
            clientModule: manifestPath,
            exportName: prerendered.exportName,
            importPath: manifestPath,
            shadow: prerendered.shadow,
            tagName: prerendered.tagName,
            usesDeclarativeShadowDom: prerendered.usesDeclarativeShadowDom,
          })
        }

        return {
          code: result.code,
          map: result.map ?? null,
        }
      } catch (error) {
        if (isNaosCompilerError(error)) {
          this.error(formatNaosDiagnostics(error.diagnostics, filename))
        }
        const message = error instanceof Error ? error.message : String(error)
        this.error(`Naos transform failed in ${filename}: ${message}`)
      }
    },
    generateBundle() {
      if (!prerenderOptions?.manifestFile || manifest.size === 0) {
        return
      }

      const manifestJson: NaosDeclarativeShadowDomManifest = {
        components: [...manifest.values()].sort((left, right) =>
          left.importPath.localeCompare(right.importPath)
        ),
      }

      this.emitFile({
        fileName: prerenderOptions.manifestFile,
        source: `${JSON.stringify(manifestJson, null, 2)}\n`,
        type: "asset",
      })
    },
  }
}

export function formatNaosDiagnostics(
  diagnostics: readonly NaosDiagnostic[],
  fallbackFilename: string
): string {
  return diagnostics
    .map((diagnostic) => {
      const filename = diagnostic.filename || fallbackFilename
      const span = diagnostic.span
        ? `:${diagnostic.span.start}-${diagnostic.span.end}`
        : ""
      const hint = diagnostic.hint ? `\nhint: ${diagnostic.hint}` : ""
      return `${filename}${span} ${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}${hint}`
    })
    .join("\n")
}

export function renderNaosDeclarativeShadowDom(
  request: RenderDeclarativeShadowDomRequest
): RenderDeclarativeShadowDomResult {
  return renderDeclarativeShadowDom(request)
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

function manifestComponentPath(filename: string): string {
  if (!isAbsolute(filename)) {
    return filename
  }

  const relativePath = relative(process.cwd(), filename).replaceAll("\\", "/")
  if (relativePath.startsWith("..")) {
    return filename
  }
  return relativePath
}

function normalizePrerenderOptions(
  options: NaosVitePluginOptions["prerender"]
): NaosDeclarativeShadowDomPrerenderOptions | null {
  if (options === false) {
    return null
  }
  if (options === undefined || options === true) {
    return {
      manifestFile: "naos-manifest.json",
    }
  }
  return {
    ...options,
    manifestFile: options.manifestFile ?? "naos-manifest.json",
  }
}
