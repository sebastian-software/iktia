import type { Api as ZagToggleGroupApi } from "@zag-js/toggle-group"

import {
  createNaosZagToggleGroupService,
  getNaosZagToggleGroupApi,
  stopNaosZagToggleGroupService,
  type NaosZagToggleGroupService,
} from "./toggle-group.js"

export type NaosZagSegmentedControlService = NaosZagToggleGroupService

type NaosSegmentedControlServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  onValueChange(value: string): void
  orientation: "horizontal" | "vertical"
  root: ParentNode
  value: string
}

type NaosSegmentedItemElement = HTMLElement & {
  disabled?: boolean
  value?: string
}

type SyncNaosSegmentedItemsOptions = {
  api: ZagToggleGroupApi
  disabled: boolean
  host: HTMLElement
  onRequestUpdate(): void
  orientation: "horizontal" | "vertical"
}

type SegmentedItem = {
  disabled: boolean
  element: NaosSegmentedItemElement
  value: string
}

const segmentedSelector = "naos-segmented-item"

export function createNaosZagSegmentedControlService({
  disabled,
  host,
  id,
  onValueChange,
  orientation,
  root,
  value,
}: NaosSegmentedControlServiceOptions): NaosZagSegmentedControlService {
  return createNaosZagToggleGroupService({
    disabled,
    host,
    id,
    multiple: false,
    onValueChange(value) {
      onValueChange(value[0] ?? "")
    },
    orientation,
    root,
    value: value ? [value] : [],
  })
}

export function getNaosZagSegmentedControlApi(
  service: NaosZagSegmentedControlService | null
): ZagToggleGroupApi | null {
  return getNaosZagToggleGroupApi(service)
}

export function stopNaosZagSegmentedControlService(
  service: NaosZagSegmentedControlService | null
) {
  stopNaosZagToggleGroupService(service)
}

export function syncNaosSegmentedItems({
  api,
  disabled,
  host,
  onRequestUpdate,
  orientation,
}: SyncNaosSegmentedItemsOptions) {
  const cleanups: VoidFunction[] = []
  const items = segmentedItemsFor(host, disabled)

  for (const item of items) {
    cleanups.push(syncSegmentedItem({
      api,
      item,
      items,
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

function syncSegmentedItem({
  api,
  item,
  items,
  onRequestUpdate,
  orientation,
}: {
  api: ZagToggleGroupApi
  item: SegmentedItem
  items: SegmentedItem[]
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

  setStringAttribute(element, "role", "radio")
  setStringAttribute(element, "aria-checked", state.pressed ? "true" : "false")
  setStringAttribute(element, "aria-disabled", disabled ? "true" : null)
  setStringAttribute(element, "data-state", state.pressed ? "selected" : "unselected")
  setStringAttribute(element, "data-orientation", orientation)
  setStringAttribute(element, "data-disabled", disabled ? "" : null)
  element.tabIndex = isTabStop ? 0 : -1

  const selectCurrent = () => {
    if (disabled) return
    api.setValue([value])
    element.focus()
    onRequestUpdate()
  }
  const clickListener = () => selectCurrent()
  const keyListener = (event: KeyboardEvent) => {
    const next = nextSegmentedItemForKey({ current: item, event, items, orientation })
    if (next == null) return
    event.preventDefault()
    if (next !== item) {
      api.setValue([next.value])
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

function segmentedItemsFor(
  host: HTMLElement,
  groupDisabled: boolean
): SegmentedItem[] {
  return Array.from(host.querySelectorAll<NaosSegmentedItemElement>(segmentedSelector))
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

function firstEnabledItem(items: SegmentedItem[]) {
  return items.find((item) => !item.disabled) ?? null
}

function nextSegmentedItemForKey({
  current,
  event,
  items,
  orientation,
}: {
  current: SegmentedItem
  event: KeyboardEvent
  items: SegmentedItem[]
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
