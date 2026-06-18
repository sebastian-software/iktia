import {
  connect,
  machine as hoverCardMachine,
  type Api as ZagHoverCardApi,
} from "@zag-js/hover-card"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type IktiaZagHoverCardService = ReturnType<typeof createZagService>

type IktiaZagHoverCardServiceOptions = {
  closeDelay: number
  disabled: boolean
  host: HTMLElement
  id: string
  onOpenChange(open: boolean): void
  open: boolean
  openDelay: number
  root: ParentNode
}

export function createIktiaZagHoverCardService({
  closeDelay,
  disabled,
  host,
  id,
  onOpenChange,
  open,
  openDelay,
  root,
}: IktiaZagHoverCardServiceOptions): IktiaZagHoverCardService {
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

export function getIktiaZagHoverCardApi(
  service: IktiaZagHoverCardService | null
): ZagHoverCardApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopIktiaZagHoverCardService(
  service: IktiaZagHoverCardService | null
) {
  service?.stop()
}
