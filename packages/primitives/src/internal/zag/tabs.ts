import {
  connect,
  machine as tabsMachine,
  type Api as ZagTabsApi,
} from "@zag-js/tabs"

import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"
import { normalizeZagProps } from "./props.js"

export type NaosZagTabsService = ReturnType<typeof createZagService>

type NaosZagTabsServiceOptions = {
  host: HTMLElement
  id: string
  onValueChange(value: string | null): void
  orientation: "horizontal" | "vertical"
  root: ParentNode
  value: string
}

type NaosTabElement = HTMLElement & {
  disabled?: boolean
  value?: string
}

type NaosTabPanelElement = HTMLElement & {
  value?: string
}

type SyncNaosTabsItemsOptions = {
  api: ZagTabsApi
  host: HTMLElement
  onRequestUpdate(): void
  orientation: "horizontal" | "vertical"
}

type TabItem = {
  disabled: boolean
  element: NaosTabElement
  value: string
}

const tabSelector = "naos-tab"
const panelSelector = "naos-tab-panel"

export function createNaosZagTabsService({
  host,
  id,
  onValueChange,
  orientation,
  root,
  value,
}: NaosZagTabsServiceOptions): NaosZagTabsService {
  return createZagService({
    machine: tabsMachine as never,
    props: {
      activationMode: "automatic",
      composite: true,
      defaultValue: value,
      id,
      loopFocus: true,
      onValueChange(details: { value: string | null }) {
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

export function getNaosZagTabsApi(
  service: NaosZagTabsService | null
): ZagTabsApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagTabsService(
  service: NaosZagTabsService | null
) {
  service?.stop()
}

export function syncNaosTabsItems({
  api,
  host,
  onRequestUpdate,
  orientation,
}: SyncNaosTabsItemsOptions) {
  const cleanups: VoidFunction[] = []
  const items = tabItemsFor(host)
  const panels = tabPanelsFor(host)

  for (const item of items) {
    cleanups.push(syncTabItem({ api, item, items, onRequestUpdate, orientation }))
  }
  for (const panel of panels) {
    syncTabPanel({ api, panel })
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

function syncTabItem({
  api,
  item,
  items,
  onRequestUpdate,
  orientation,
}: {
  api: ZagTabsApi
  item: TabItem
  items: TabItem[]
  onRequestUpdate(): void
  orientation: "horizontal" | "vertical"
}) {
  const { disabled, element, value } = item
  const isSelected = api.value === value
  const isTabStop =
    !disabled &&
    (isSelected || (!api.value && firstEnabledItem(items)?.element === element))

  setStringAttribute(element, "slot", "tab")
  setStringAttribute(element, "role", "tab")
  setStringAttribute(element, "aria-selected", isSelected ? "true" : "false")
  setStringAttribute(element, "aria-disabled", disabled ? "true" : null)
  setStringAttribute(element, "data-state", isSelected ? "selected" : "unselected")
  setStringAttribute(element, "data-orientation", orientation)
  setStringAttribute(element, "data-disabled", disabled ? "" : null)
  element.tabIndex = isTabStop ? 0 : -1

  const selectCurrent = () => {
    if (disabled) return
    api.setValue(value)
    element.focus()
    onRequestUpdate()
  }
  const clickListener = () => selectCurrent()
  const keyListener = (event: KeyboardEvent) => {
    const next = nextTabItemForKey({ current: item, event, items, orientation })
    if (next == null) return
    event.preventDefault()
    if (next !== item) {
      api.setValue(next.value)
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

function syncTabPanel({
  api,
  panel,
}: {
  api: ZagTabsApi
  panel: NaosTabPanelElement
}) {
  const value = panel.value ?? panel.getAttribute("value") ?? ""
  if (!value) return
  const isSelected = api.value === value

  setStringAttribute(panel, "slot", "panel")
  setStringAttribute(panel, "role", "tabpanel")
  setStringAttribute(panel, "data-state", isSelected ? "selected" : "unselected")
  setStringAttribute(panel, "data-value", value)
  setStringAttribute(panel, "hidden", isSelected ? null : "")
}

function tabItemsFor(host: HTMLElement): TabItem[] {
  return Array.from(host.querySelectorAll<NaosTabElement>(tabSelector))
    .map((element) => {
      const value = element.value ?? element.getAttribute("value") ?? ""
      return {
        disabled: Boolean(element.disabled) || element.hasAttribute("disabled"),
        element,
        value,
      }
    })
    .filter((item) => item.value.length > 0)
}

function tabPanelsFor(host: HTMLElement): NaosTabPanelElement[] {
  return Array.from(host.querySelectorAll<NaosTabPanelElement>(panelSelector))
}

function firstEnabledItem(items: TabItem[]) {
  return items.find((item) => !item.disabled) ?? null
}

function nextTabItemForKey({
  current,
  event,
  items,
  orientation,
}: {
  current: TabItem
  event: KeyboardEvent
  items: TabItem[]
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
