import {
  connect,
  machine as radioGroupMachine,
  type Api as ZagRadioGroupApi,
} from "@zag-js/radio-group"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"
import {
  createIktiaContext,
  provideIktiaContext,
  type IktiaContextProvider,
} from "../behavior/context.js"

export type IktiaZagRadioGroupService = ReturnType<typeof createZagService>

type IktiaZagRadioGroupServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  name: string
  onValueChange(value: string): void
  orientation: "horizontal" | "vertical"
  root: ParentNode
  value: string
}

type IktiaRadioItemElement = HTMLElement & {
  disabled?: boolean
  value?: string
}

export type IktiaRadioGroupContext = {
  syncRadio(options: SyncIktiaRadioOptions): VoidFunction
}

type RadioItem = {
  disabled: boolean
  element: IktiaRadioItemElement
  value: string
}

type SyncIktiaRadioOptions = {
  disabled: boolean
  element: IktiaRadioItemElement
  value: string
}

export type IktiaRadioGroupContextController = {
  destroy(): void
  update(options: IktiaRadioGroupContextUpdate): void
}

type IktiaRadioGroupContextUpdate = {
  api: ZagRadioGroupApi
  disabled: boolean
  orientation: "horizontal" | "vertical"
}

const documentPositionPreceding = 2
const documentPositionFollowing = 4

export const IKTIA_RADIO_GROUP_CONTEXT =
  createIktiaContext<IktiaRadioGroupContext>("iktia-radio-group")

export function createIktiaZagRadioGroupService({
  disabled,
  host,
  id,
  name,
  onValueChange,
  orientation,
  root,
  value,
}: IktiaZagRadioGroupServiceOptions): IktiaZagRadioGroupService {
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

export function getIktiaZagRadioGroupApi(
  service: IktiaZagRadioGroupService | null
): ZagRadioGroupApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopIktiaZagRadioGroupService(
  service: IktiaZagRadioGroupService | null
) {
  service?.stop()
}

export function createIktiaRadioGroupContextController({
  host,
  onRequestUpdate,
}: {
  host: HTMLElement
  onRequestUpdate(): void
}): IktiaRadioGroupContextController {
  let current: IktiaRadioGroupContextUpdate | null = null
  const radios = new Map<IktiaRadioItemElement, RadioItem>()

  const context: IktiaRadioGroupContext = {
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
        if (next !== item) {
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
  const provider: IktiaContextProvider<IktiaRadioGroupContext> =
    provideIktiaContext({
      context: IKTIA_RADIO_GROUP_CONTEXT,
      host,
      value: context,
    })

  const currentItems = (active: IktiaRadioGroupContextUpdate | null = current) => {
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
        onRequestUpdate,
        orientation: active.orientation,
        attachListeners: false,
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
  attachListeners = true,
  api,
  item,
  items,
  onRequestUpdate,
  orientation,
}: {
  attachListeners?: boolean
  api: ZagRadioGroupApi
  item: RadioItem
  items: RadioItem[]
  onRequestUpdate(): void
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

  if (!attachListeners) return () => undefined

  const selectCurrent = () => {
    if (disabled) return
    api.setValue(value)
    element.focus()
    onRequestUpdate()
  }
  const clickListener = () => selectCurrent()
  const keyListener = (event: KeyboardEvent) => {
    const next = nextRadioItemForKey({ current: item, event, items, orientation })
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
