import {
  collection as listboxCollection,
  connect,
  machine as listboxMachine,
  type Api as ZagListboxApi,
} from "@zag-js/listbox"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type IktiaListboxItem = {
  disabled: boolean
  label: string
  value: string
}

export type IktiaZagListboxService = ReturnType<typeof createZagService>

type IktiaZagListboxServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  items: IktiaListboxItem[]
  multiple: boolean
  onHighlightChange(value: string): void
  onValueChange(value: string[]): void
  orientation: "horizontal" | "vertical"
  root: ParentNode
  value: string[]
}

type IktiaListboxItemElement = HTMLElement & {
  disabled?: boolean
  label?: string
  value?: string
}

type SyncIktiaListboxItemsOptions = {
  api: ZagListboxApi
  disabled: boolean
  host: HTMLElement
  onRequestUpdate(): void
}

const listboxItemSelector = "iktia-listbox-item"

export function parseIktiaListboxValue(value: string): string[] {
  return value.split(/\s+/).filter(Boolean)
}

export function serializeIktiaListboxValue(value: string[]): string {
  return value.join(" ")
}

export function listboxFormValue({
  multiple,
  name,
  value,
}: {
  multiple: boolean
  name: string
  value: string[]
}): FormDataEntryValue | FormData | null {
  if (value.length === 0) return null
  if (!multiple) return value[0] ?? null
  if (!name) return null
  const data = new FormData()
  for (const item of value) data.append(name, item)
  return data
}

export function collectIktiaListboxItems(host: HTMLElement): IktiaListboxItem[] {
  return Array.from(host.querySelectorAll<IktiaListboxItemElement>(listboxItemSelector))
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

export function createIktiaZagListboxService({
  disabled,
  host,
  id,
  items,
  multiple,
  onHighlightChange,
  onValueChange,
  orientation,
  root,
  value,
}: IktiaZagListboxServiceOptions): IktiaZagListboxService {
  return createZagService({
    machine: listboxMachine as never,
    props: {
      collection: createListboxCollection(items),
      defaultValue: value,
      disabled,
      id,
      loopFocus: true,
      onHighlightChange(details: { highlightedValue: string | null }) {
        onHighlightChange(details.highlightedValue ?? "")
      },
      onValueChange(details: { value: string[] }) {
        onValueChange(details.value)
      },
      orientation,
      selectionMode: multiple ? "multiple" : "single",
      typeahead: true,
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getIktiaZagListboxApi(
  service: IktiaZagListboxService | null
): ZagListboxApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopIktiaZagListboxService(
  service: IktiaZagListboxService | null
) {
  service?.stop()
}

export function syncIktiaListboxItems({
  api,
  disabled,
  host,
  onRequestUpdate,
}: SyncIktiaListboxItemsOptions) {
  const cleanups: VoidFunction[] = []
  const items = collectIktiaListboxItems(host)

  for (const item of items) {
    const element = host.querySelector<IktiaListboxItemElement>(
      `${listboxItemSelector}[value="${cssEscape(item.value)}"]`
    )
    if (element == null) continue
    cleanups.push(syncListboxItem({ api, disabled, element, item, onRequestUpdate }))
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

function createListboxCollection(items: IktiaListboxItem[]) {
  return listboxCollection({
    items,
    isItemDisabled: (item) => item.disabled,
    itemToString: (item) => item.label,
    itemToValue: (item) => item.value,
  })
}

function syncListboxItem({
  api,
  disabled,
  element,
  item,
  onRequestUpdate,
}: {
  api: ZagListboxApi
  disabled: boolean
  element: IktiaListboxItemElement
  item: IktiaListboxItem
  onRequestUpdate(): void
}) {
  const itemState = api.getItemState({ item, highlightOnHover: true })
  const itemDisabled = disabled || itemState.disabled

  setStringAttribute(element, "slot", "item")
  setStringAttribute(element, "role", "option")
  setStringAttribute(element, "aria-selected", itemState.selected ? "true" : "false")
  setStringAttribute(element, "aria-disabled", itemDisabled ? "true" : null)
  setStringAttribute(element, "data-state", itemState.selected ? "checked" : "unchecked")
  setStringAttribute(element, "data-highlighted", itemState.highlighted ? "" : null)
  setStringAttribute(element, "data-focused", itemState.focused ? "" : null)
  setStringAttribute(element, "data-disabled", itemDisabled ? "" : null)
  setStringAttribute(element, "data-value", item.value)

  const clickListener = () => {
    if (itemDisabled) return
    api.selectValue(item.value)
    api.highlightValue(item.value)
    onRequestUpdate()
  }
  const pointerMoveListener = () => {
    if (itemDisabled) return
    api.highlightValue(item.value)
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
