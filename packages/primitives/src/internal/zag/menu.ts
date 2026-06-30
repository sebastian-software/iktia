import {
  connect,
  machine as menuMachine,
  type Api as ZagMenuApi,
  type PositioningOptions,
} from "@zag-js/menu"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosMenuItem = {
  disabled: boolean
  label: string
  value: string
}

export type NaosZagMenuService = ReturnType<typeof createZagService>

type NaosZagMenuServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  label: string
  onHighlightChange(value: string | null): void
  onOpenChange(open: boolean): void
  positioning?: PositioningOptions
  root: ParentNode
}

type NaosMenuItemElement = HTMLElement & {
  disabled?: boolean
  label?: string
  value?: string
}

type SyncNaosMenuItemsOptions = {
  api: ZagMenuApi
  disabled: boolean
  host: HTMLElement
  onRequestUpdate(): void
  onSelect(value: string): void
}

const menuItemSelector = "naos-menu-item"

export function collectNaosMenuItems(host: HTMLElement): NaosMenuItem[] {
  return Array.from(host.querySelectorAll<NaosMenuItemElement>(menuItemSelector))
    .map((element) => {
      const value = element.value ?? element.getAttribute("value") ?? ""
      const label =
        element.label ??
        element.getAttribute("label") ??
        element.textContent?.trim() ??
        value
      return {
        disabled: Boolean(element.disabled) || element.hasAttribute("disabled"),
        label,
        value,
      }
    })
    .filter((item) => item.value.length > 0)
}

export function createNaosZagMenuService({
  disabled,
  host,
  id,
  label,
  onHighlightChange,
  onOpenChange,
  positioning = { placement: "bottom-start", sameWidth: true },
  root,
}: NaosZagMenuServiceOptions): NaosZagMenuService {
  return createZagService({
    machine: menuMachine as never,
    props: {
      "aria-label": label,
      closeOnSelect: true,
      disabled,
      id,
      loopFocus: true,
      onHighlightChange(details: { highlightedValue: string | null }) {
        onHighlightChange(details.highlightedValue)
      },
      onOpenChange(details: { open: boolean }) {
        onOpenChange(details.open)
      },
      positioning,
      typeahead: true,
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagMenuApi(
  service: NaosZagMenuService | null
): ZagMenuApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagMenuService(service: NaosZagMenuService | null) {
  service?.stop()
}

export function syncNaosMenuItems({
  api,
  disabled,
  host,
  onRequestUpdate,
  onSelect,
}: SyncNaosMenuItemsOptions) {
  const cleanups: VoidFunction[] = []
  const items = collectNaosMenuItems(host)

  for (const item of items) {
    const element = host.querySelector<NaosMenuItemElement>(
      `${menuItemSelector}[value="${cssEscape(item.value)}"]`
    )
    if (element == null) continue
    cleanups.push(syncMenuItem({
      api,
      disabled,
      element,
      item,
      onRequestUpdate,
      onSelect,
    }))
  }

  const observer = new MutationObserver(() => onRequestUpdate())
  observer.observe(host, {
    attributeFilter: ["disabled", "label", "value"],
    attributes: true,
    childList: true,
    subtree: true,
  })
  cleanups.push(() => observer.disconnect())

  return () => {
    for (const cleanup of cleanups.splice(0)) cleanup()
  }
}

function syncMenuItem({
  api,
  disabled,
  element,
  item,
  onRequestUpdate,
  onSelect,
}: {
  api: ZagMenuApi
  disabled: boolean
  element: NaosMenuItemElement
  item: NaosMenuItem
  onRequestUpdate(): void
  onSelect(value: string): void
}) {
  const itemState = api.getItemState({ disabled: item.disabled, value: item.value })
  const itemDisabled = disabled || itemState.disabled

  setStringAttribute(element, "slot", "item")
  applyElementProps(element, api.getItemProps({
    disabled: itemDisabled,
    value: item.value,
    valueText: item.label,
  }))
  setStringAttribute(element, "aria-disabled", itemDisabled ? "true" : null)
  setStringAttribute(element, "data-disabled", itemDisabled ? "" : null)
  setStringAttribute(element, "data-highlighted", itemState.highlighted ? "" : null)
  setStringAttribute(element, "data-state", itemState.highlighted ? "highlighted" : "idle")

  const clickListener = () => {
    if (itemDisabled) return
    api.setHighlightedValue(item.value)
    api.setOpen(false)
    onSelect(item.value)
    onRequestUpdate()
  }
  const pointerMoveListener = () => {
    if (itemDisabled) return
    api.setHighlightedValue(item.value)
    onRequestUpdate()
  }

  element.addEventListener("click", clickListener)
  element.addEventListener("pointermove", pointerMoveListener)
  return () => {
    element.removeEventListener("click", clickListener)
    element.removeEventListener("pointermove", pointerMoveListener)
  }
}

function applyElementProps(element: HTMLElement, props: Record<string, unknown>) {
  for (const [name, value] of Object.entries(props)) {
    if (name.startsWith("on") || name === "style") continue
    setStringAttribute(element, attributeNameFromProp(name), attributeValue(value))
  }
}

function attributeNameFromProp(name: string) {
  if (name === "className") return "class"
  if (name === "htmlFor") return "for"
  return name
}

function attributeValue(value: unknown) {
  if (value == null || value === false) return null
  return value === true ? "" : String(value)
}

function cssEscape(value: string) {
  return typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(value)
    : value.replaceAll("\"", "\\\"")
}

function setStringAttribute(
  element: HTMLElement,
  name: string,
  value: string | null
) {
  if (value == null) {
    if (!element.hasAttribute(name)) return
    element.removeAttribute(name)
    return
  }
  if (element.getAttribute(name) === value) return
  element.setAttribute(name, value)
}
