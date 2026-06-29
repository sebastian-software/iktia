export type IktiaOverlayKind =
  | "combobox"
  | "context-menu"
  | "dialog"
  | "hover-card"
  | "menu"
  | "popover"
  | "select"
  | "tooltip"

export type IktiaOverlaySide = "bottom" | "left" | "none" | "right" | "top"
export type IktiaOverlayAlign = "center" | "end" | "start"
export type IktiaOverlayCloseReason =
  | "disconnect"
  | "escape"
  | "interact-outside"
  | "programmatic"

export type IktiaOverlayState = {
  align?: IktiaOverlayAlign | null
  anchorHidden?: boolean
  kind: IktiaOverlayKind
  layer?: number | string | null
  modal?: boolean
  open: boolean
  side?: IktiaOverlaySide | null
}

export type IktiaOverlayGeometry = {
  anchorHeight?: number | string | null
  anchorWidth?: number | string | null
  availableHeight?: number | string | null
  availableWidth?: number | string | null
  popupHeight?: number | string | null
  popupWidth?: number | string | null
  positionerHeight?: number | string | null
  positionerWidth?: number | string | null
  transformOrigin?: string | null
}

export type IktiaOverlayLayer = {
  close(reason: IktiaOverlayCloseReason): void
  id: string
  modal?: boolean
}

export const iktiaOverlayCssVariableNames = [
  "--iktia-anchor-width",
  "--iktia-anchor-height",
  "--iktia-available-width",
  "--iktia-available-height",
  "--iktia-popup-width",
  "--iktia-popup-height",
  "--iktia-positioner-width",
  "--iktia-positioner-height",
  "--iktia-transform-origin",
] as const

export function getIktiaOverlayStateAttributes({
  align,
  anchorHidden = false,
  kind,
  layer,
  modal = false,
  open,
  side,
}: IktiaOverlayState): Record<string, string | undefined> {
  return {
    "data-align": align ?? undefined,
    "data-anchor-hidden": anchorHidden ? "" : undefined,
    "data-iktia-overlay": kind,
    "data-layer": layer == null ? undefined : String(layer),
    "data-modal": modal ? "" : undefined,
    "data-side": side ?? undefined,
    "data-state": open ? "open" : "closed",
  }
}

export function getIktiaOverlayGeometryStyle(
  geometry: IktiaOverlayGeometry
): Record<string, string> {
  const style: Record<string, string> = {}
  setCssDimension(style, "--iktia-anchor-width", geometry.anchorWidth)
  setCssDimension(style, "--iktia-anchor-height", geometry.anchorHeight)
  setCssDimension(style, "--iktia-available-width", geometry.availableWidth)
  setCssDimension(style, "--iktia-available-height", geometry.availableHeight)
  setCssDimension(style, "--iktia-popup-width", geometry.popupWidth)
  setCssDimension(style, "--iktia-popup-height", geometry.popupHeight)
  setCssDimension(style, "--iktia-positioner-width", geometry.positionerWidth)
  setCssDimension(style, "--iktia-positioner-height", geometry.positionerHeight)
  if (geometry.transformOrigin != null) {
    style["--iktia-transform-origin"] = geometry.transformOrigin
  }
  return style
}

export function createIktiaOverlayLayerStack() {
  const layers: IktiaOverlayLayer[] = []

  return {
    closeTop(reason: IktiaOverlayCloseReason) {
      const layer = layers.at(-1)
      if (layer == null) return false
      layer.close(reason)
      return true
    },
    isTopLayer(id: string) {
      return layers.at(-1)?.id === id
    },
    register(layer: IktiaOverlayLayer) {
      const duplicateIndex = layers.findIndex((candidate) => candidate.id === layer.id)
      if (duplicateIndex !== -1) layers.splice(duplicateIndex, 1)
      layers.push(layer)
      return () => {
        const index = layers.findIndex((candidate) => candidate.id === layer.id)
        if (index !== -1) layers.splice(index, 1)
      }
    },
    size() {
      return layers.length
    },
    topLayer() {
      return layers.at(-1) ?? null
    },
  }
}

export function shouldCloseIktiaOverlayForKey(event: {
  defaultPrevented?: boolean
  key: string
}) {
  return event.key === "Escape" && event.defaultPrevented !== true
}

export function isIktiaOverlayOutsideEventPath(
  path: readonly EventTarget[],
  protectedTargets: readonly (EventTarget | null | undefined)[]
) {
  return protectedTargets.every((target) => target == null || !path.includes(target))
}

export function listenForIktiaOverlayEscape({
  onClose,
  target,
}: {
  onClose(event: KeyboardEvent): void
  target: EventTarget
}) {
  const abort = new AbortController()
  target.addEventListener("keydown", (event) => {
    if (!(event instanceof KeyboardEvent)) return
    if (!shouldCloseIktiaOverlayForKey(event)) return
    event.preventDefault()
    onClose(event)
  }, { signal: abort.signal })
  return () => abort.abort()
}

function setCssDimension(
  style: Record<string, string>,
  name: (typeof iktiaOverlayCssVariableNames)[number],
  value: number | string | null | undefined
) {
  if (value == null) return
  style[name] = typeof value === "number" ? `${value}px` : value
}
