import { isAbsolute, relative } from "node:path"

import {
  renderDeclarativeShadowDom,
  transformComponent,
  type RenderDeclarativeShadowDomRequest,
  type RenderDeclarativeShadowDomResult,
} from "@iktia/compiler"
import { createFilter, type FilterPattern, type Plugin } from "vite"

export type IktiaVitePluginOptions = {
  include?: FilterPattern
  exclude?: FilterPattern
  prerender?: boolean | IktiaDeclarativeShadowDomPrerenderOptions
}

export type IktiaDeclarativeShadowDomPrerenderOptions = {
  include?: FilterPattern
  exclude?: FilterPattern
  manifestFile?: string | false
}

export type IktiaDeclarativeShadowDomManifestEntry = {
  tagName: string
  className: string
  exportName?: string | null
  importPath: string
  clientModule: string
  shadow: boolean
  usesDeclarativeShadowDom: boolean
}

export type IktiaDeclarativeShadowDomManifest = {
  components: IktiaDeclarativeShadowDomManifestEntry[]
}

export function iktia(options: IktiaVitePluginOptions = {}): Plugin {
  const filter = createFilter(options.include ?? /\.wc\.tsx$/, options.exclude ?? /node_modules/)
  const prerenderOptions = normalizePrerenderOptions(options.prerender)
  const prerenderFilter = prerenderOptions
    ? createFilter(
        prerenderOptions.include ?? options.include ?? /\.wc\.tsx$/,
        prerenderOptions.exclude ?? options.exclude ?? /node_modules/
      )
    : null
  const manifest = new Map<string, IktiaDeclarativeShadowDomManifestEntry>()

  return {
    name: "iktia:transform",
    enforce: "pre",
    transform(code, id) {
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
          const prerendered = renderIktiaDeclarativeShadowDom({
            filename,
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
          map: null,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        this.error(`Iktia transform failed in ${filename}: ${message}`)
      }
    },
    generateBundle() {
      if (!prerenderOptions?.manifestFile || manifest.size === 0) {
        return
      }

      const manifestJson: IktiaDeclarativeShadowDomManifest = {
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

export function renderIktiaDeclarativeShadowDom(
  request: RenderDeclarativeShadowDomRequest
): RenderDeclarativeShadowDomResult {
  return renderDeclarativeShadowDom(request)
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
  options: IktiaVitePluginOptions["prerender"]
): IktiaDeclarativeShadowDomPrerenderOptions | null {
  if (!options) {
    return null
  }
  if (options === true) {
    return {
      manifestFile: "iktia-manifest.json",
    }
  }
  return {
    ...options,
    manifestFile: options.manifestFile ?? "iktia-manifest.json",
  }
}
