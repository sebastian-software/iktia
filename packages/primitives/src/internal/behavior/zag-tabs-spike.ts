import {
  connect,
  machine as tabsMachine,
  type Api as ZagTabsApi,
} from "@zag-js/tabs"

import { type TabsOrientation } from "./tabs.js"
import { createZagService } from "./zag-service.js"

type ZagTabsProbeOptions = {
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
  sentEvents(): readonly string[]
  value(): string | null
}

export function createZagTabsProbe({
  id = "iktia-zag-tabs-spike",
  orientation = "horizontal",
  value,
  values,
}: ZagTabsProbeOptions): ZagTabsProbe {
  const sentEvents: string[] = []
  const service = createZagService({
    machine: tabsMachine as never,
    props: {
      activationMode: "automatic",
      composite: true,
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
      getById: () => null,
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
    sentEvents: () => sentEvents,
    value: () => service.context.get("value") as string | null,
  }
}
