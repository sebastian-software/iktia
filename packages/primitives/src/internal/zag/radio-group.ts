import {
  connect,
  machine as radioGroupMachine,
  type Api as ZagRadioGroupApi,
} from "@zag-js/radio-group"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"
import {
  createNaosContext,
  provideNaosContext,
  type NaosContextProvider,
} from "../behavior/context.js"

export type NaosZagRadioGroupService = ReturnType<typeof createZagService>

type NaosZagRadioGroupServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  name: string
  onValueChange(value: string): void
  orientation: "horizontal" | "vertical"
  root: ParentNode
  value: string
}

type NaosRadioItemElement = HTMLElement & {
  disabled?: boolean
  value?: string
}

export type NaosRadioGroupContext = {
  syncRadio(options: SyncNaosRadioOptions): VoidFunction
}

type RadioItem = {
  disabled: boolean
  element: NaosRadioItemElement
  value: string
}

type SyncNaosRadioOptions = {
  disabled: boolean
  element: NaosRadioItemElement
  value: string
}

export type NaosRadioGroupContextController = {
  destroy(): void
  update(options: NaosRadioGroupContextUpdate): void
}

type NaosRadioGroupContextUpdate = {
  api: ZagRadioGroupApi
  disabled: boolean
  orientation: "horizontal" | "vertical"
}

const documentPositionPreceding = 2
const documentPositionFollowing = 4

export const NAOS_RADIO_GROUP_CONTEXT =
  createNaosContext<NaosRadioGroupContext>("naos-radio-group")

export function createNaosZagRadioGroupService({
  disabled,
  host,
  id,
  name,
  onValueChange,
  orientation,
  root,
  value,
}: NaosZagRadioGroupServiceOptions): NaosZagRadioGroupService {
  return createZagService({
    machine: radioGroupMachine as never,
    props: {
      defaultValue: value || null,
      disabled,
      id,
      name,
      onValueChange(details: { value: string | null }) {
        onValueChange(details.value ?? "")
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

export function getNaosZagRadioGroupApi(
  service: NaosZagRadioGroupService | null
): ZagRadioGroupApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagRadioGroupService(
  service: NaosZagRadioGroupService | null
) {
  service?.stop()
}

export function createNaosRadioGroupContextController({
  host,
  onRequestUpdate,
}: {
  host: HTMLElement
  onRequestUpdate(): void
}): NaosRadioGroupContextController {
  let current: NaosRadioGroupContextUpdate | null = null
  const radios = new Map<NaosRadioItemElement, RadioItem>()

  const context: NaosRadioGroupContext = {
    syncRadio({ disabled, element, value }) {
      if (!value) return () => undefined
      const item = { disabled, element, value }
      radios.set(element, item)
      const selectCurrent = () => {
        if (current == null || current.disabled || item.disabled || !item.value) return
        current.api.setValue(item.value)
        item.element.focus()
        onRequestUpdate()
        syncAll()
      }
      const clickListener = () => selectCurrent()
      const keyListener = (event: KeyboardEvent) => {
        if (current == null) return
        const next = nextRadioItemForKey({
          current: item,
          event,
          items: currentItems(),
          orientation: current.orientation,
        })
        if (next == null) return
        event.preventDefault()
        if (next.element !== item.element) {
          current.api.setValue(next.value)
          next.element.focus()
          onRequestUpdate()
          syncAll()
          return
        }
        selectCurrent()
      }

      element.addEventListener("click", clickListener)
      element.addEventListener("keydown", keyListener)
      syncAll()

      return () => {
        element.removeEventListener("click", clickListener)
        element.removeEventListener("keydown", keyListener)
        if (radios.get(element) === item) {
          radios.delete(element)
          syncAll()
        }
      }
    },
  }
  const provider: NaosContextProvider<NaosRadioGroupContext> =
    provideNaosContext({
      context: NAOS_RADIO_GROUP_CONTEXT,
      host,
      value: context,
    })

  const currentItems = (active: NaosRadioGroupContextUpdate | null = current) => {
    const items = Array.from(radios.values())
      .filter((item) => item.value.length > 0)
      .sort(compareRadioItems)
    if (active == null) return items
    return items.map((item) => ({
      ...item,
      disabled: active.disabled || item.disabled,
    }))
  }

  const syncAll = () => {
    const active = current
    if (active == null) return
    const items = currentItems(active)
    for (const item of items) {
      syncRadioItem({
        api: active.api,
        item,
        items,
        orientation: active.orientation,
      })
    }
  }

  return {
    destroy() {
      provider.destroy()
      radios.clear()
    },
    update(options) {
      current = options
      syncAll()
    },
  }
}

function syncRadioItem({
  api,
  item,
  items,
  orientation,
}: {
  api: ZagRadioGroupApi
  item: RadioItem
  items: RadioItem[]
  orientation: "horizontal" | "vertical"
}) {
  const { disabled, element, value } = item
  const state = api.getItemState({ disabled, value })
  const isTabStop =
    !disabled &&
    (state.checked ||
      (api.value == null && firstEnabledItem(items)?.element === element))

  setStringAttribute(element, "role", "radio")
  setStringAttribute(element, "aria-checked", state.checked ? "true" : "false")
  setStringAttribute(element, "aria-disabled", disabled ? "true" : null)
  setStringAttribute(element, "data-state", state.checked ? "checked" : "unchecked")
  setStringAttribute(element, "data-orientation", orientation)
  setStringAttribute(element, "data-disabled", disabled ? "" : null)
  element.tabIndex = isTabStop ? 0 : -1
}

function compareRadioItems(a: RadioItem, b: RadioItem) {
  if (a.element === b.element) return 0
  const position = a.element.compareDocumentPosition(b.element)
  if (position & documentPositionPreceding) return 1
  if (position & documentPositionFollowing) return -1
  return 0
}

function firstEnabledItem(items: RadioItem[]) {
  return items.find((item) => !item.disabled) ?? null
}

function nextRadioItemForKey({
  current,
  event,
  items,
  orientation,
}: {
  current: RadioItem
  event: KeyboardEvent
  items: RadioItem[]
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
