import {
  connect,
  machine as dialogMachine,
  type Api as ZagDialogApi,
} from "@zag-js/dialog"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagDialogService = ReturnType<typeof createZagService>

type NaosZagDialogServiceOptions = {
  host: HTMLElement
  id: string
  label: string
  modal: boolean
  onOpenChange(open: boolean): void
  open: boolean
  root: ParentNode
}

export function createNaosZagDialogService({
  host,
  id,
  label,
  modal,
  onOpenChange,
  open,
  root,
}: NaosZagDialogServiceOptions): NaosZagDialogService {
  return createZagService({
    machine: dialogMachine as never,
    props: {
      "aria-label": label,
      closeOnEscape: true,
      closeOnInteractOutside: true,
      defaultOpen: open,
      finalFocusEl: () =>
        host.shadowRoot?.querySelector<HTMLElement>("[part~='trigger']") ?? host,
      id,
      modal,
      onOpenChange(details: { open: boolean }) {
        onOpenChange(details.open)
      },
      preventScroll: modal,
      restoreFocus: true,
      role: "dialog",
      trapFocus: modal,
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagDialogApi(
  service: NaosZagDialogService | null
): ZagDialogApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagDialogService(
  service: NaosZagDialogService | null
) {
  service?.stop()
}
