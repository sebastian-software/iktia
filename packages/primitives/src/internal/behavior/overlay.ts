export type NaosOverlayKind =
  | "combobox"
  | "context-menu"
  | "dialog"
  | "hover-card"
  | "menu"
  | "popover"
  | "select"
  | "tooltip"

export type NaosOverlaySide = "bottom" | "left" | "none" | "right" | "top"
export type NaosOverlayAlign = "center" | "end" | "start"
export type NaosOverlayCloseReason =
  | "disconnect"
  | "escape"
  | "interact-outside"
  | "programmatic"

export type NaosOverlayState = {
  align?: NaosOverlayAlign | null
  anchorHidden?: boolean
  kind: NaosOverlayKind
  layer?: number | string | null
  modal?: boolean
  open: boolean
  side?: NaosOverlaySide | null
}

export type NaosOverlayGeometry = {
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

export type NaosOverlayLayer = {
  close(reason: NaosOverlayCloseReason): void
  id: string
  modal?: boolean
}

export const naosOverlayCssVariableNames = [
  "--naos-anchor-width",
  "--naos-anchor-height",
  "--naos-available-width",
  "--naos-available-height",
  "--naos-popup-width",
  "--naos-popup-height",
  "--naos-positioner-width",
  "--naos-positioner-height",
  "--naos-transform-origin",
] as const

export function getNaosOverlayStateAttributes({
  align,
  anchorHidden = false,
  kind,
  layer,
  modal = false,
  open,
  side,
}: NaosOverlayState): Record<string, string | undefined> {
  return {
    "data-align": align ?? undefined,
    "data-anchor-hidden": anchorHidden ? "" : undefined,
    "data-naos-overlay": kind,
    "data-layer": layer == null ? undefined : String(layer),
    "data-modal": modal ? "" : undefined,
    "data-side": side ?? undefined,
    "data-state": open ? "open" : "closed",
  }
}

export function getNaosOverlayGeometryStyle(
  geometry: NaosOverlayGeometry
): Record<string, string> {
  const style: Record<string, string> = {}
  setCssDimension(style, "--naos-anchor-width", geometry.anchorWidth)
  setCssDimension(style, "--naos-anchor-height", geometry.anchorHeight)
  setCssDimension(style, "--naos-available-width", geometry.availableWidth)
  setCssDimension(style, "--naos-available-height", geometry.availableHeight)
  setCssDimension(style, "--naos-popup-width", geometry.popupWidth)
  setCssDimension(style, "--naos-popup-height", geometry.popupHeight)
  setCssDimension(style, "--naos-positioner-width", geometry.positionerWidth)
  setCssDimension(style, "--naos-positioner-height", geometry.positionerHeight)
  if (geometry.transformOrigin != null) {
    style["--naos-transform-origin"] = geometry.transformOrigin
  }
  return style
}

export function createNaosOverlayLayerStack() {
  const layers: NaosOverlayLayer[] = []

  return {
    closeTop(reason: NaosOverlayCloseReason) {
      const layer = layers.at(-1)
      if (layer == null) return false
      layer.close(reason)
      return true
    },
    isTopLayer(id: string) {
      return layers.at(-1)?.id === id
    },
    register(layer: NaosOverlayLayer) {
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

export function shouldCloseNaosOverlayForKey(event: {
  defaultPrevented?: boolean
  key: string
}) {
  return event.key === "Escape" && event.defaultPrevented !== true
}

export function isNaosOverlayOutsideEventPath(
  path: readonly EventTarget[],
  protectedTargets: readonly (EventTarget | null | undefined)[]
) {
  return protectedTargets.every((target) => target == null || !path.includes(target))
}

export function listenForNaosOverlayEscape({
  onClose,
  target,
}: {
  onClose(event: KeyboardEvent): void
  target: EventTarget
}) {
  const abort = new AbortController()
  target.addEventListener("keydown", (event) => {
    if (!(event instanceof KeyboardEvent)) return
    if (!shouldCloseNaosOverlayForKey(event)) return
    event.preventDefault()
    onClose(event)
  }, { signal: abort.signal })
  return () => abort.abort()
}

function setCssDimension(
  style: Record<string, string>,
  name: (typeof naosOverlayCssVariableNames)[number],
  value: number | string | null | undefined
) {
  if (value == null) return
  style[name] = typeof value === "number" ? `${value}px` : value
}
