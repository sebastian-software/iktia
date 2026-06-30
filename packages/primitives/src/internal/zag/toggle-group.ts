import {
  connect,
  machine as toggleGroupMachine,
  type Api as ZagToggleGroupApi,
} from "@zag-js/toggle-group"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagToggleGroupService = ReturnType<typeof createZagService>

type NaosZagToggleGroupServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  multiple: boolean
  onValueChange(value: string[]): void
  orientation: "horizontal" | "vertical"
  root: ParentNode
  value: string[]
}

type NaosToggleItemElement = HTMLElement & {
  disabled?: boolean
  value?: string
}

type SyncNaosToggleGroupItemsOptions = {
  api: ZagToggleGroupApi
  disabled: boolean
  host: HTMLElement
  multiple: boolean
  onRequestUpdate(): void
  orientation: "horizontal" | "vertical"
}

type ToggleItem = {
  disabled: boolean
  element: NaosToggleItemElement
  value: string
}

const toggleSelector = "naos-toggle-item"

export function parseNaosToggleGroupValue(value: string): string[] {
  return value.split(/\s+/).filter(Boolean)
}

export function serializeNaosToggleGroupValue(value: string[]): string {
  return value.join(" ")
}

export function toggleGroupFormValue({
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

export function createNaosZagToggleGroupService({
  disabled,
  host,
  id,
  multiple,
  onValueChange,
  orientation,
  root,
  value,
}: NaosZagToggleGroupServiceOptions): NaosZagToggleGroupService {
  return createZagService({
    machine: toggleGroupMachine as never,
    props: {
      defaultValue: value,
      disabled,
      id,
      multiple,
      onValueChange(details: { value: string[] }) {
        onValueChange(details.value)
      },
      orientation,
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagToggleGroupApi(
  service: NaosZagToggleGroupService | null
): ZagToggleGroupApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagToggleGroupService(
  service: NaosZagToggleGroupService | null
) {
  service?.stop()
}

export function syncNaosToggleGroupItems({
  api,
  disabled,
  host,
  multiple,
  onRequestUpdate,
  orientation,
}: SyncNaosToggleGroupItemsOptions) {
  const cleanups: VoidFunction[] = []
  const items = toggleItemsFor(host, disabled)

  for (const item of items) {
    cleanups.push(syncToggleItem({
      api,
      item,
      items,
      multiple,
      onRequestUpdate,
      orientation,
    }))
  }

  const observer = new MutationObserver(() => onRequestUpdate())
  observer.observe(host, {
    attributeFilter: ["disabled", "value"],
    attributes: true,
    childList: true,
    subtree: true,
  })
  cleanups.push(() => observer.disconnect())

  return () => {
    for (const cleanup of cleanups.splice(0)) cleanup()
  }
}

function syncToggleItem({
  api,
  item,
  items,
  multiple,
  onRequestUpdate,
  orientation,
}: {
  api: ZagToggleGroupApi
  item: ToggleItem
  items: ToggleItem[]
  multiple: boolean
  onRequestUpdate(): void
  orientation: "horizontal" | "vertical"
}) {
  const { disabled, element, value } = item
  const state = api.getItemState({ disabled, value })
  const isTabStop =
    !disabled &&
    (state.focused ||
      state.pressed ||
      (!api.value.some(Boolean) && firstEnabledItem(items)?.element === element))

  setStringAttribute(element, "role", multiple ? "button" : "radio")
  setStringAttribute(element, "aria-pressed", multiple ? String(state.pressed) : null)
  setStringAttribute(element, "aria-checked", multiple ? null : String(state.pressed))
  setStringAttribute(element, "aria-disabled", disabled ? "true" : null)
  setStringAttribute(element, "data-state", state.pressed ? "on" : "off")
  setStringAttribute(element, "data-orientation", orientation)
  setStringAttribute(element, "data-disabled", disabled ? "" : null)
  element.tabIndex = isTabStop ? 0 : -1

  const selectCurrent = () => {
    if (disabled) return
    api.setValue(nextToggleGroupValue(api.value, value, multiple))
    element.focus()
    onRequestUpdate()
  }
  const clickListener = () => selectCurrent()
  const keyListener = (event: KeyboardEvent) => {
    const next = nextToggleItemForKey({ current: item, event, items, orientation })
    if (next == null) return
    event.preventDefault()
    if (next !== item) {
      next.element.focus()
      onRequestUpdate()
      return
    }
    selectCurrent()
  }

  element.addEventListener("click", clickListener)
  element.addEventListener("keydown", keyListener)
  return () => {
    element.removeEventListener("click", clickListener)
    element.removeEventListener("keydown", keyListener)
  }
}

function nextToggleGroupValue(
  current: string[],
  value: string,
  multiple: boolean
) {
  if (!multiple) return current.includes(value) ? [] : [value]
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value]
}

function toggleItemsFor(host: HTMLElement, groupDisabled: boolean): ToggleItem[] {
  return Array.from(host.querySelectorAll<NaosToggleItemElement>(toggleSelector))
    .map((element) => {
      const value = element.value ?? element.getAttribute("value") ?? ""
      return {
        disabled:
          groupDisabled ||
          Boolean(element.disabled) ||
          element.hasAttribute("disabled"),
        element,
        value,
      }
    })
    .filter((item) => item.value.length > 0)
}

function firstEnabledItem(items: ToggleItem[]) {
  return items.find((item) => !item.disabled) ?? null
}

function nextToggleItemForKey({
  current,
  event,
  items,
  orientation,
}: {
  current: ToggleItem
  event: KeyboardEvent
  items: ToggleItem[]
  orientation: "horizontal" | "vertical"
}) {
  const enabled = items.filter((item) => !item.disabled)
  if (enabled.length === 0) return null

  if (event.key === " " || event.key === "Enter") return current
  if (event.key === "Home") return enabled[0]
  if (event.key === "End") return enabled[enabled.length - 1]

  const index = enabled.findIndex((item) => item.element === current.element)
  if (index < 0) return null
  if (orientation === "horizontal" && event.key === "ArrowRight") {
    return enabled[(index + 1) % enabled.length]
  }
  if (orientation === "horizontal" && event.key === "ArrowLeft") {
    return enabled[(index - 1 + enabled.length) % enabled.length]
  }
  if (orientation === "vertical" && event.key === "ArrowDown") {
    return enabled[(index + 1) % enabled.length]
  }
  if (orientation === "vertical" && event.key === "ArrowUp") {
    return enabled[(index - 1 + enabled.length) % enabled.length]
  }
  return null
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
