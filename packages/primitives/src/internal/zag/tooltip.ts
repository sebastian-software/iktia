import {
  connect,
  machine as tooltipMachine,
  type Api as ZagTooltipApi,
} from "@zag-js/tooltip"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagTooltipService = ReturnType<typeof createZagService>

type NaosZagTooltipServiceOptions = {
  closeDelay: number
  disabled: boolean
  host: HTMLElement
  id: string
  onOpenChange(open: boolean): void
  open: boolean
  openDelay: number
  root: ParentNode
}

export function createNaosZagTooltipService({
  closeDelay,
  disabled,
  host,
  id,
  onOpenChange,
  open,
  openDelay,
  root,
}: NaosZagTooltipServiceOptions): NaosZagTooltipService {
  return createZagService({
    machine: tooltipMachine as never,
    props: {
      closeDelay,
      closeOnClick: true,
      closeOnEscape: true,
      closeOnPointerDown: true,
      closeOnScroll: true,
      defaultOpen: open,
      disabled,
      id,
      onOpenChange(details: { open: boolean }) {
        onOpenChange(details.open)
      },
      openDelay,
      positioning: { placement: "top", gutter: 8 },
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagTooltipApi(
  service: NaosZagTooltipService | null
): ZagTooltipApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagTooltipService(
  service: NaosZagTooltipService | null
) {
  service?.stop()
}
