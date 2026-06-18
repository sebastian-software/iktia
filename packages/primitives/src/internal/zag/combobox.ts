import {
  collection as comboboxCollection,
  connect,
  machine as comboboxMachine,
  type Api as ZagComboboxApi,
} from "@zag-js/combobox"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type IktiaComboboxItem = {
  disabled: boolean
  label: string
  value: string
}

export type IktiaZagComboboxService = ReturnType<typeof createZagService>

type IktiaZagComboboxServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  inputValue: string
  items: IktiaComboboxItem[]
  name: string
  onInputValueChange(value: string): void
  onOpenChange(open: boolean): void
  onValueChange(value: string): void
  placeholder: string
  root: ParentNode
  value: string
}

type IktiaComboboxItemElement = HTMLElement & {
  disabled?: boolean
  label?: string
  value?: string
}

type SyncIktiaComboboxItemsOptions = {
  api: ZagComboboxApi
  disabled: boolean
  host: HTMLElement
  onRequestUpdate(): void
}

const comboboxItemSelector = "iktia-combobox-item"

export function collectIktiaComboboxItems(host: HTMLElement): IktiaComboboxItem[] {
  return Array.from(host.querySelectorAll<IktiaComboboxItemElement>(comboboxItemSelector))
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

export function labelForIktiaComboboxValue(host: HTMLElement, value: string) {
  return collectIktiaComboboxItems(host).find((item) => item.value === value)?.label ?? ""
}

export function createIktiaZagComboboxService({
  disabled,
  host,
  id,
  inputValue,
  items,
  name,
  onInputValueChange,
  onOpenChange,
  onValueChange,
  placeholder,
  root,
  value,
}: IktiaZagComboboxServiceOptions): IktiaZagComboboxService {
  return createZagService({
    machine: comboboxMachine as never,
    props: {
      collection: createComboboxCollection(items),
      defaultInputValue: inputValue,
      defaultValue: value ? [value] : [],
      disabled,
      id,
      inputBehavior: "autohighlight",
      name,
      onInputValueChange(details: { inputValue: string }) {
        onInputValueChange(details.inputValue)
      },
      onOpenChange(details: { open: boolean }) {
        onOpenChange(details.open)
      },
      onValueChange(details: { value: string[] }) {
        onValueChange(details.value[0] ?? "")
      },
      openOnClick: true,
      openOnKeyPress: true,
      placeholder,
      positioning: { sameWidth: true },
      selectionBehavior: "replace",
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getIktiaZagComboboxApi(
  service: IktiaZagComboboxService | null
): ZagComboboxApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopIktiaZagComboboxService(
  service: IktiaZagComboboxService | null
) {
  service?.stop()
}

export function syncIktiaComboboxItems({
  api,
  disabled,
  host,
  onRequestUpdate,
}: SyncIktiaComboboxItemsOptions) {
  const cleanups: VoidFunction[] = []
  const items = collectIktiaComboboxItems(host)

  for (const item of items) {
    const element = host.querySelector<IktiaComboboxItemElement>(
      `${comboboxItemSelector}[value="${cssEscape(item.value)}"]`
    )
    if (element == null) continue
    cleanups.push(syncComboboxItem({ api, disabled, element, item, onRequestUpdate }))
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

function createComboboxCollection(items: IktiaComboboxItem[]) {
  return comboboxCollection({
    items,
    isItemDisabled: (item) => item.disabled,
    itemToString: (item) => item.label,
    itemToValue: (item) => item.value,
  })
}

function syncComboboxItem({
  api,
  disabled,
  element,
  item,
  onRequestUpdate,
}: {
  api: ZagComboboxApi
  disabled: boolean
  element: IktiaComboboxItemElement
  item: IktiaComboboxItem
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
    api.setOpen(false, "item-select")
    api.selectValue(item.value)
    api.setInputValue(item.label)
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
