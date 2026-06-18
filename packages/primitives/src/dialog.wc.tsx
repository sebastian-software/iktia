import {
  computed,
  effect,
  event,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@iktia/core"
import {
  createIktiaZagDialogService,
  getIktiaZagDialogApi,
  stopIktiaZagDialogService,
} from "./internal/zag/dialog.js"
import type { IktiaZagDialogService } from "./internal/zag/dialog.js"
import css from "./dialog.wc.css?inline"

export type IktiaDialogProps = {
  description?: string
  label?: string
  modal?: boolean
  open?: boolean
  title?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaDialog({
  description = "Dialog content",
  label = "Open dialog",
  modal = true,
  open = false,
  title = "Dialog",
}: IktiaDialogProps = {}) {
  const expanded = state(open)
  const dialogService = state<IktiaZagDialogService | null>(null)
  const dialogApi = computed(() => getIktiaZagDialogApi(dialogService()))
  const changed = event<{ open: boolean }>("iktia-open-change")

  onConnected(() => {
    dialogService.set(createIktiaZagDialogService({
      host: host().element,
      id: "iktia-dialog",
      label,
      modal,
      onOpenChange(nextOpen) {
        expanded.set(nextOpen)
        changed.emit({ open: nextOpen })
      },
      open: expanded(),
      root: host().root,
    }))
  })
  onDisconnected(() => {
    stopIktiaZagDialogService(dialogService())
    dialogService.set(null)
  })
  effect(() => {
    const api = dialogApi()
    void expanded()
    if (api == null || !expanded()) return
    const trigger = host().root.querySelector("[part~='trigger']")
    const content = host().root.querySelector("[part~='content']")
    const closeDialog = () => {
      api.setOpen(false)
      if (!(trigger instanceof HTMLElement)) return
      setTimeout(() => trigger.focus(), 0)
    }
    const abort = new AbortController()
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return
      event.preventDefault()
      closeDialog()
    }, { signal: abort.signal })
    document.addEventListener("pointerdown", (event) => {
      const path = event.composedPath()
      if (content != null && path.includes(content)) return
      if (trigger != null && path.includes(trigger)) return
      closeDialog()
    }, { capture: true, signal: abort.signal })
    return () => abort.abort()
  })

  return (
    <div part="root" data-state={expanded() ? "open" : "closed"}>
      <button
        {...(dialogApi()?.getTriggerProps() ?? {})}
        part="trigger"
        aria-expanded={expanded() ? "true" : "false"}
        data-state={expanded() ? "open" : "closed"}
      >
        <slot name="trigger">{label}</slot>
      </button>
      <div
        {...(dialogApi()?.getBackdropProps() ?? {})}
        part="backdrop"
        data-state={expanded() ? "open" : "closed"}
      />
      <div {...(dialogApi()?.getPositionerProps() ?? {})} part="positioner">
        <section
          {...(dialogApi()?.getContentProps() ?? {})}
          part="content"
          aria-modal={modal ? "true" : undefined}
          data-state={expanded() ? "open" : "closed"}
        >
          <div part="header">
            <h2 {...(dialogApi()?.getTitleProps() ?? {})} part="title">
              <slot name="title">{title}</slot>
            </h2>
            <button
              {...(dialogApi()?.getCloseTriggerProps() ?? {})}
              part="close"
            >
              <slot name="close">Close</slot>
            </button>
          </div>
          <div {...(dialogApi()?.getDescriptionProps() ?? {})} part="description">
            <slot>{description}</slot>
          </div>
        </section>
      </div>
    </div>
  )
}
