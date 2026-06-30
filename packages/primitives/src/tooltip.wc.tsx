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
  createNaosZagTooltipService,
  getNaosZagTooltipApi,
  stopNaosZagTooltipService,
} from "./internal/zag/tooltip.js"
import type { NaosZagTooltipService } from "./internal/zag/tooltip.js"
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
import css from "./tooltip.wc.css?inline"

export type NaosTooltipProps = {
  closeDelay?: number
  disabled?: boolean
  label?: string
  open?: boolean
  openDelay?: number
  text?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosTooltip({
  closeDelay = 0,
  disabled = false,
  label = "Help",
  open = false,
  openDelay = 0,
  text = "More information",
}: NaosTooltipProps = {}) {
  const expanded = state(open)
  const presence = state(createNaosPresenceSnapshot(open))
  const tooltipService = state<NaosZagTooltipService | null>(null)
  const tooltipApi = computed(() => getNaosZagTooltipApi(tooltipService()))
  const changed = event<{ open: boolean }>("naos-open-change")

  onConnected(() => {
    tooltipService.set(createNaosZagTooltipService({
      closeDelay,
      disabled,
      host: host().element,
      id: "naos-tooltip",
      onOpenChange(nextOpen) {
        expanded.set(nextOpen)
        changed.emit({ open: nextOpen })
      },
      open: expanded(),
      openDelay,
      root: host().root,
    }))
  })
  onDisconnected(() => {
    stopNaosZagTooltipService(tooltipService())
    tooltipService.set(null)
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
    const api = tooltipApi()
    void expanded()
    if (api == null || !expanded()) return
    return listenForNaosOverlayEscape({
      onClose: () => api.setOpen(false),
      target: document,
    })
  })
  effect(() => {
    const api = tooltipApi()
    if (api == null) return
    const trigger = host().root.querySelector("[part~='trigger']")
    if (!(trigger instanceof HTMLElement)) return
    const abort = new AbortController()
    const open = () => {
      if (!disabled) api.setOpen(true)
    }
    const close = () => api.setOpen(false)
    trigger.addEventListener("pointerenter", (event) => {
      if (disabled || event.pointerType === "touch") return
      api.setOpen(true)
    }, { signal: abort.signal })
    trigger.addEventListener("pointermove", (event) => {
      if (disabled || event.pointerType === "touch") return
      api.setOpen(true)
    }, { signal: abort.signal })
    trigger.addEventListener("pointerleave", close, { signal: abort.signal })
    trigger.addEventListener("focus", open, { signal: abort.signal })
    trigger.addEventListener("blur", close, { signal: abort.signal })
    return () => abort.abort()
  })

  return (
    <span
      part="root"
      {...getNaosOverlayStateAttributes({
        kind: "tooltip",
        open: isNaosPresenceOpen(presence()),
      })}
      {...getNaosPresenceAttributes(presence())}
      {...getNaosPresenceMotionAttributes()}
    >
      <button
        {...(tooltipApi()?.getTriggerProps() ?? {})}
        part="trigger"
        type="button"
        disabled={disabled}
        data-state={expanded() ? "open" : "closed"}
        data-disabled={disabled || undefined}
      >
        <slot name="trigger">{label}</slot>
      </button>
      <span
        {...(tooltipApi()?.getPositionerProps() ?? {})}
        part="positioner"
        {...getNaosOverlayStateAttributes({
          kind: "tooltip",
          open: isNaosPresenceOpen(presence()),
        })}
        {...getNaosPresenceAttributes(presence())}
        hidden={isNaosPresenceHidden(presence())}
      >
        <span
          {...(tooltipApi()?.getContentProps() ?? {})}
          part="content"
          {...getNaosOverlayStateAttributes({
            kind: "tooltip",
            open: isNaosPresenceOpen(presence()),
          })}
          {...getNaosPresenceAttributes(presence())}
          hidden={isNaosPresenceHidden(presence())}
        >
          <slot>{text}</slot>
        </span>
      </span>
    </span>
  )
}
