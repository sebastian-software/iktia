import {
  collection as selectCollection,
  connect,
  machine as selectMachine,
  type Api as ZagSelectApi,
} from "@zag-js/select"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosSelectItem = {
  disabled: boolean
  label: string
  value: string
}

export type NaosZagSelectService = ReturnType<typeof createZagService>

type NaosZagSelectServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  items: NaosSelectItem[]
  name: string
  onOpenChange(open: boolean): void
  onValueChange(value: string): void
  root: ParentNode
  value: string
}

type NaosSelectItemElement = HTMLElement & {
  disabled?: boolean
  label?: string
  value?: string
}

type SyncNaosSelectItemsOptions = {
  api: ZagSelectApi
  disabled: boolean
  host: HTMLElement
  onRequestUpdate(): void
}

const selectItemSelector = "naos-select-item"

export function collectNaosSelectItems(host: HTMLElement): NaosSelectItem[] {
  return Array.from(host.querySelectorAll<NaosSelectItemElement>(selectItemSelector))
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

export function labelForNaosSelectValue(host: HTMLElement, value: string) {
  return collectNaosSelectItems(host).find((item) => item.value === value)?.label ?? ""
}

export function createNaosZagSelectService({
  disabled,
  host,
  id,
  items,
  name,
  onOpenChange,
  onValueChange,
  root,
  value,
}: NaosZagSelectServiceOptions): NaosZagSelectService {
  return createZagService({
    machine: selectMachine as never,
    props: {
      collection: createSelectCollection(items),
      defaultValue: value ? [value] : [],
      disabled,
      id,
      loopFocus: true,
      name,
      onOpenChange(details: { open: boolean }) {
        onOpenChange(details.open)
      },
      onValueChange(details: { value: string[] }) {
        onValueChange(details.value[0] ?? "")
      },
      positioning: { sameWidth: true },
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagSelectApi(
  service: NaosZagSelectService | null
): ZagSelectApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagSelectService(
  service: NaosZagSelectService | null
) {
  service?.stop()
}

export function syncNaosSelectItems({
  api,
  disabled,
  host,
  onRequestUpdate,
}: SyncNaosSelectItemsOptions) {
  const cleanups: VoidFunction[] = []
  const items = collectNaosSelectItems(host)

  for (const item of items) {
    const element = host.querySelector<NaosSelectItemElement>(
      `${selectItemSelector}[value="${cssEscape(item.value)}"]`
    )
    if (element == null) continue
    cleanups.push(syncSelectItem({ api, disabled, element, item, onRequestUpdate }))
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

function createSelectCollection(items: NaosSelectItem[]) {
  return selectCollection({
    items,
    isItemDisabled: (item) => item.disabled,
    itemToString: (item) => item.label,
    itemToValue: (item) => item.value,
  })
}

function syncSelectItem({
  api,
  disabled,
  element,
  item,
  onRequestUpdate,
}: {
  api: ZagSelectApi
  disabled: boolean
  element: NaosSelectItemElement
  item: NaosSelectItem
  onRequestUpdate(): void
}) {
  const itemState = api.getItemState({ item })
  const itemDisabled = disabled || itemState.disabled

  setStringAttribute(element, "slot", "item")
  setStringAttribute(element, "role", "option")
  setStringAttribute(element, "aria-selected", itemState.selected ? "true" : "false")
  setStringAttribute(element, "aria-disabled", itemDisabled ? "true" : null)
  setStringAttribute(element, "data-state", itemState.selected ? "checked" : "unchecked")
  setStringAttribute(element, "data-highlighted", itemState.highlighted ? "" : null)
  setStringAttribute(element, "data-disabled", itemDisabled ? "" : null)
  setStringAttribute(element, "data-value", item.value)

  const clickListener = () => {
    if (itemDisabled) return
    api.setOpen(false)
    api.setValue([item.value])
    api.focus()
    onRequestUpdate()
  }
  const pointerMoveListener = () => {
    if (itemDisabled) return
    api.setHighlightValue(item.value)
    onRequestUpdate()
  }

  element.addEventListener("click", clickListener)
  element.addEventListener("pointermove", pointerMoveListener)
  return () => {
    element.removeEventListener("click", clickListener)
    element.removeEventListener("pointermove", pointerMoveListener)
  }
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
