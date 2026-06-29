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
  createIktiaZagPopoverService,
  getIktiaZagPopoverApi,
  stopIktiaZagPopoverService,
} from "./internal/zag/popover.js"
import type { IktiaZagPopoverService } from "./internal/zag/popover.js"
import {
  getIktiaOverlayStateAttributes,
  listenForIktiaOverlayEscape,
} from "./internal/behavior/overlay.js"
import css from "./popover.wc.css?inline"

export type IktiaPopoverProps = {
  label?: string
  modal?: boolean
  open?: boolean
  title?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaPopover({
  label = "Open",
  modal = false,
  open = false,
  title = "Details",
}: IktiaPopoverProps = {}) {
  const expanded = state(open)
  const popoverService = state<IktiaZagPopoverService | null>(null)
  const popoverApi = computed(() => getIktiaZagPopoverApi(popoverService()))
  const changed = event<{ open: boolean }>("iktia-open-change")

  onConnected(() => {
    popoverService.set(createIktiaZagPopoverService({
      host: host().element,
      id: "iktia-popover",
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
    stopIktiaZagPopoverService(popoverService())
    popoverService.set(null)
  })
  effect(() => {
    const api = popoverApi()
    void expanded()
    if (api == null || !expanded()) return
    return listenForIktiaOverlayEscape({
      onClose: () => api.setOpen(false),
      target: document,
    })
  })

  return (
    <div
      part="root"
      {...getIktiaOverlayStateAttributes({
        kind: "popover",
        modal,
        open: expanded(),
      })}
    >
      <button
        {...(popoverApi()?.getTriggerProps() ?? {})}
        part="trigger"
        aria-expanded={expanded() ? "true" : "false"}
        data-state={expanded() ? "open" : "closed"}
      >
        <slot name="trigger">{label}</slot>
      </button>
      <div
        {...(popoverApi()?.getPositionerProps() ?? {})}
        part="positioner"
        {...getIktiaOverlayStateAttributes({
          kind: "popover",
          modal,
          open: expanded(),
        })}
      >
        <div
          {...(popoverApi()?.getContentProps() ?? {})}
          part="content"
          {...getIktiaOverlayStateAttributes({
            kind: "popover",
            modal,
            open: expanded(),
          })}
        >
          <div part="header">
            <h2 {...(popoverApi()?.getTitleProps() ?? {})} part="title">
              <slot name="title">{title}</slot>
            </h2>
            <button
              {...(popoverApi()?.getCloseTriggerProps() ?? {})}
              part="close"
            >
              <slot name="close">Close</slot>
            </button>
          </div>
          <div {...(popoverApi()?.getDescriptionProps() ?? {})} part="description">
            <slot />
          </div>
        </div>
      </div>
    </div>
  )
}
