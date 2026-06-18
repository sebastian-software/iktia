import {
  connect,
  machine as tabsMachine,
  type Api as ZagTabsApi,
} from "@zag-js/tabs"

import { type TabsOrientation } from "./tabs.js"
import { createZagService } from "./zag-service.js"

type ZagTabsProbeOptions = {
  composite?: boolean
  id?: string
  orientation?: TabsOrientation
  value: string
  values: readonly string[]
}

const normalizeProps = {
  button: <T extends Record<string, unknown>>(props: T) => props,
  element: <T extends Record<string, unknown>>(props: T) => props,
}

export type ZagTabsProbe = {
  api(): ZagTabsApi
  focusedElement(): string | null
  sentEvents(): readonly string[]
  value(): string | null
}

type FakeTabElement = {
  dataset: { value: string }
  focus(): void
  id: string
}

type FakeListElement = {
  querySelectorAll(selector: string): FakeTabElement[]
}

export function createZagTabsProbe({
  composite = true,
  id = "iktia-zag-tabs-spike",
  orientation = "horizontal",
  value,
  values,
}: ZagTabsProbeOptions): ZagTabsProbe {
  const sentEvents: string[] = []
  let service: ReturnType<typeof createZagService>
  let focusedElement: string | null = null
  const triggerId = (item: string) => `tabs:${id}:trigger-${item}`
  const listId = `tabs:${id}:list`
  const triggers = values.map((item): FakeTabElement => ({
    dataset: { value: item },
    focus: () => {
      focusedElement = item
      service.send({ type: "TAB_FOCUS", value: item })
    },
    id: triggerId(item),
  }))
  const list: FakeListElement = {
    querySelectorAll: () => triggers,
  }
  const elementById = new Map<string, FakeListElement | FakeTabElement>([
    [listId, list],
    ...triggers.map((trigger) => [trigger.id, trigger] as const),
  ])

  service = createZagService({
    machine: tabsMachine as never,
    props: {
      activationMode: "automatic",
      composite,
      defaultValue: value,
      id,
      loopFocus: true,
      onValueChange() {
        // The probe reads the service context directly; this hook proves the
        // bindable bridge can call Zag-style change callbacks.
      },
      orientation,
    },
    scope: {
      getById: (elementId: string) => elementById.get(elementId) ?? null,
      id,
    },
  })
  const baseSend = service.send
  service.send = (event: { type: string }) => {
    sentEvents.push(event.type)
    baseSend(event)
  }
  void values

  return {
    api: () => connect(service as never, normalizeProps as never),
    focusedElement: () => focusedElement,
    sentEvents: () => sentEvents,
    value: () => service.context.get("value") as string | null,
  }
}
