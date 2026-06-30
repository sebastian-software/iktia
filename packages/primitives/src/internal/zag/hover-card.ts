import {
  connect,
  machine as hoverCardMachine,
  type Api as ZagHoverCardApi,
} from "@zag-js/hover-card"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagHoverCardService = ReturnType<typeof createZagService>

type NaosZagHoverCardServiceOptions = {
  closeDelay: number
  disabled: boolean
  host: HTMLElement
  id: string
  onOpenChange(open: boolean): void
  open: boolean
  openDelay: number
  root: ParentNode
}

export function createNaosZagHoverCardService({
  closeDelay,
  disabled,
  host,
  id,
  onOpenChange,
  open,
  openDelay,
  root,
}: NaosZagHoverCardServiceOptions): NaosZagHoverCardService {
  return createZagService({
    machine: hoverCardMachine as never,
    props: {
      closeDelay,
      defaultOpen: open,
      disabled,
      id,
      onOpenChange(details: { open: boolean }) {
        onOpenChange(details.open)
      },
      openDelay,
      positioning: { placement: "bottom-start", gutter: 8 },
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagHoverCardApi(
  service: NaosZagHoverCardService | null
): ZagHoverCardApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagHoverCardService(
  service: NaosZagHoverCardService | null
) {
  service?.stop()
}
