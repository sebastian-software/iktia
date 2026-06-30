import {
  computed,
  effect,
  event,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import {
  createNaosZagPopoverService,
  getNaosZagPopoverApi,
  stopNaosZagPopoverService,
} from "./internal/zag/popover.js"
import type { NaosZagPopoverService } from "./internal/zag/popover.js"
import {
  getNaosOverlayStateAttributes,
  listenForNaosOverlayEscape,
} from "./internal/behavior/overlay.js"
import {
  createNaosPresenceSnapshot,
  getNaosPresenceAttributes,
  getNaosPresenceMotionAttributes,
  isNaosPresenceHidden,
  isNaosPresenceOpen,
  nextNaosPresenceSnapshot,
  scheduleNaosPresenceFrame,
  settleNaosPresenceSnapshot,
  waitForNaosPresenceExit,
} from "./internal/behavior/presence.js"
import css from "./popover.wc.css?inline"

export type NaosPopoverProps = {
  label?: string
  modal?: boolean
  open?: boolean
  title?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosPopover({
  label = "Open",
  modal = false,
  open = false,
  title = "Details",
}: NaosPopoverProps = {}) {
  const expanded = state(open)
  const presence = state(createNaosPresenceSnapshot(open))
  const popoverService = state<NaosZagPopoverService | null>(null)
  const popoverApi = computed(() => getNaosZagPopoverApi(popoverService()))
  const changed = event<{ open: boolean }>("naos-open-change")

  onConnected(() => {
    popoverService.set(createNaosZagPopoverService({
      host: host().element,
      id: "naos-popover",
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
    stopNaosZagPopoverService(popoverService())
    popoverService.set(null)
  })
  effect(() => {
    const next = nextNaosPresenceSnapshot(presence(), expanded())
    if (next !== presence()) presence.set(next)
  })
  effect(() => {
    const snapshot = presence()
    if (snapshot.phase === "entering") {
      return scheduleNaosPresenceFrame(() => {
        if (expanded()) {
          presence.set(settleNaosPresenceSnapshot(presence(), true))
        }
      })
    }
    if (snapshot.phase !== "closing") return
    const content = host().root.querySelector("[part~='content']")
    return waitForNaosPresenceExit(
      content instanceof Element ? content : null,
      () => {
        if (!expanded()) {
          presence.set(settleNaosPresenceSnapshot(presence(), false))
        }
      }
    )
  })
  effect(() => {
    const api = popoverApi()
    void expanded()
    if (api == null || !expanded()) return
    return listenForNaosOverlayEscape({
      onClose: () => api.setOpen(false),
      target: document,
    })
  })

  return (
    <div
      part="root"
      {...getNaosOverlayStateAttributes({
        kind: "popover",
        modal,
        open: isNaosPresenceOpen(presence()),
      })}
      {...getNaosPresenceAttributes(presence())}
      {...getNaosPresenceMotionAttributes()}
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
        {...getNaosOverlayStateAttributes({
          kind: "popover",
          modal,
          open: isNaosPresenceOpen(presence()),
        })}
        {...getNaosPresenceAttributes(presence())}
        hidden={isNaosPresenceHidden(presence())}
      >
        <div
          {...(popoverApi()?.getContentProps() ?? {})}
          part="content"
          {...getNaosOverlayStateAttributes({
            kind: "popover",
            modal,
            open: isNaosPresenceOpen(presence()),
          })}
          {...getNaosPresenceAttributes(presence())}
          hidden={isNaosPresenceHidden(presence())}
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
