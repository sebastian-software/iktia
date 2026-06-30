import {
  connect,
  machine as accordionMachine,
  type Api as ZagAccordionApi,
} from "@zag-js/accordion"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagAccordionService = ReturnType<typeof createZagService>

type NaosZagAccordionServiceOptions = {
  collapsible: boolean
  disabled: boolean
  host: HTMLElement
  id: string
  multiple: boolean
  onFocusChange(value: string | null): void
  onValueChange(value: string[]): void
  orientation: "horizontal" | "vertical"
  root: ParentNode
  value: string[]
}

type NaosAccordionItemElement = HTMLElement & {
  disabled?: boolean
  label?: string
  value?: string
}

type AccordionItem = {
  disabled: boolean
  element: NaosAccordionItemElement
  label: string
  value: string
}

type SyncNaosAccordionItemsOptions = {
  api: ZagAccordionApi
  disabled: boolean
  host: HTMLElement
  onRequestUpdate(): void
}

const accordionItemSelector = "naos-accordion-item"

export function parseNaosAccordionValue(value: string): string[] {
  return value.split(/\s+/).filter(Boolean)
}

export function serializeNaosAccordionValue(value: string[]): string {
  return value.join(" ")
}

export function createNaosZagAccordionService({
  collapsible,
  disabled,
  host,
  id,
  multiple,
  onFocusChange,
  onValueChange,
  orientation,
  root,
  value,
}: NaosZagAccordionServiceOptions): NaosZagAccordionService {
  return createZagService({
    machine: accordionMachine as never,
    props: {
      collapsible,
      defaultValue: value,
      disabled,
      id,
      multiple,
      onFocusChange(details: { value: string | null }) {
        onFocusChange(details.value)
      },
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

export function getNaosZagAccordionApi(
  service: NaosZagAccordionService | null
): ZagAccordionApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagAccordionService(
  service: NaosZagAccordionService | null
) {
  service?.stop()
}

export function syncNaosAccordionItems({
  api,
  disabled,
  host,
  onRequestUpdate,
}: SyncNaosAccordionItemsOptions) {
  const cleanups: VoidFunction[] = []
  const items = accordionItemsFor(host, disabled)

  for (const item of items) {
    cleanups.push(syncAccordionItem({ api, item, items, onRequestUpdate }))
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

function syncAccordionItem({
  api,
  item,
  items,
  onRequestUpdate,
}: {
  api: ZagAccordionApi
  item: AccordionItem
  items: AccordionItem[]
  onRequestUpdate(): void
}) {
  const cleanups: VoidFunction[] = []
  const state = api.getItemState({ disabled: item.disabled, value: item.value })
  const trigger = item.element.shadowRoot?.querySelector<HTMLElement>(
    "[part~='trigger']"
  )
  const content = item.element.shadowRoot?.querySelector<HTMLElement>(
    "[part~='content']"
  )
  const indicator = item.element.shadowRoot?.querySelector<HTMLElement>(
    "[part~='indicator']"
  )

  if (trigger == null || content == null || indicator == null) {
    const timeout = setTimeout(onRequestUpdate, 0)
    cleanups.push(() => clearTimeout(timeout))
  }

  applyElementProps(item.element, api.getItemProps({
    disabled: item.disabled,
    value: item.value,
  }), cleanups)
  setStringAttribute(item.element, "aria-disabled", state.disabled ? "true" : null)
  setStringAttribute(item.element, "data-disabled", state.disabled ? "" : null)
  setStringAttribute(item.element, "data-focus", state.focused ? "" : null)
  setStringAttribute(item.element, "data-state", state.expanded ? "open" : "closed")

  if (trigger != null) {
    applyElementProps(trigger, api.getItemTriggerProps({
      disabled: item.disabled,
      value: item.value,
    }), cleanups)
    setStringAttribute(trigger, "aria-expanded", String(state.expanded))
    trigger.textContent = ""
    const indicatorElement = item.element.shadowRoot?.querySelector("[part~='indicator']")
    const labelElement = item.element.shadowRoot?.querySelector("[part~='label']")
    if (indicatorElement != null) trigger.append(indicatorElement)
    if (labelElement != null) trigger.append(labelElement)
    const keyListener = (event: KeyboardEvent) => {
      const next = nextAccordionItemForKey({ current: item, event, items })
      if (next == null || next === item) return
      event.preventDefault()
      next.element.shadowRoot
        ?.querySelector<HTMLElement>("[part~='trigger']")
        ?.focus()
    }
    trigger.addEventListener("keydown", keyListener)
    cleanups.push(() => trigger.removeEventListener("keydown", keyListener))
  }

  if (content != null) {
    applyElementProps(content, api.getItemContentProps({
      disabled: item.disabled,
      value: item.value,
    }), cleanups)
  }

  if (indicator != null) {
    applyElementProps(indicator, api.getItemIndicatorProps({
      disabled: item.disabled,
      value: item.value,
    }), cleanups)
    indicator.textContent = state.expanded ? "-" : "+"
  }

  return () => {
    for (const cleanup of cleanups.splice(0)) cleanup()
  }
}

function accordionItemsFor(
  host: HTMLElement,
  groupDisabled: boolean
): AccordionItem[] {
  return Array.from(
    host.querySelectorAll<NaosAccordionItemElement>(accordionItemSelector)
  )
    .map((element) => {
      const value = element.value ?? element.getAttribute("value") ?? ""
      const label =
        element.label ??
        element.getAttribute("label") ??
        element.textContent?.trim() ??
        value
      return {
        disabled:
          groupDisabled ||
          Boolean(element.disabled) ||
          element.hasAttribute("disabled"),
        element,
        label,
        value,
      }
    })
    .filter((item) => item.value.length > 0)
}

function applyElementProps(
  element: HTMLElement,
  props: Record<string, unknown>,
  cleanups: VoidFunction[]
) {
  for (const [name, value] of Object.entries(props)) {
    if (name === "style") continue
    if (name.startsWith("on") && typeof value === "function") {
      const eventName = eventNameFromProp(name)
      if (eventName == null) continue
      const listener = value as EventListener
      element.addEventListener(eventName, listener)
      cleanups.push(() => element.removeEventListener(eventName, listener))
      continue
    }
    setStringAttribute(element, attributeNameFromProp(name), attributeValue(name, value))
  }
}

function attributeNameFromProp(name: string) {
  if (name === "className") return "class"
  if (name === "htmlFor") return "for"
  return name
}

function attributeValue(name: string, value: unknown) {
  if (value == null || value === false) return null
  if (name.startsWith("aria-") && typeof value === "boolean") return String(value)
  return value === true ? "" : String(value)
}

function eventNameFromProp(name: string) {
  const aliases: Record<string, string> = {
    onBlur: "blur",
    onClick: "click",
    onFocus: "focus",
    onKeyDown: "keydown",
  }
  return aliases[name] ?? null
}

function nextAccordionItemForKey({
  current,
  event,
  items,
}: {
  current: AccordionItem
  event: KeyboardEvent
  items: AccordionItem[]
}) {
  const enabled = items.filter((item) => !item.disabled)
  if (enabled.length === 0) return null
  if (event.key === "Home") return enabled[0]
  if (event.key === "End") return enabled[enabled.length - 1]

  const index = enabled.findIndex((item) => item.element === current.element)
  if (index < 0) return null
  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
    return enabled[(index + 1) % enabled.length]
  }
  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
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
