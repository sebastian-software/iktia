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
  createNaosZagHoverCardService,
  getNaosZagHoverCardApi,
  stopNaosZagHoverCardService,
} from "./internal/zag/hover-card.js"
import type { NaosZagHoverCardService } from "./internal/zag/hover-card.js"
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
import css from "./hover-card.wc.css?inline"

export type NaosHoverCardProps = {
  closeDelay?: number
  disabled?: boolean
  label?: string
  open?: boolean
  openDelay?: number
  text?: string
  title?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosHoverCard({
  closeDelay = 0,
  disabled = false,
  label = "Preview",
  open = false,
  openDelay = 0,
  text = "Additional details",
  title = "Details",
}: NaosHoverCardProps = {}) {
  const expanded = state(open)
  const presence = state(createNaosPresenceSnapshot(open))
  const hoverCardService = state<NaosZagHoverCardService | null>(null)
  const hoverCardApi = computed(() => getNaosZagHoverCardApi(hoverCardService()))
  const changed = event<{ open: boolean }>("naos-open-change")

  onConnected(() => {
    hoverCardService.set(createNaosZagHoverCardService({
      closeDelay,
      disabled,
      host: host().element,
      id: "naos-hover-card",
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
    stopNaosZagHoverCardService(hoverCardService())
    hoverCardService.set(null)
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
    const api = hoverCardApi()
    void expanded()
    if (api == null || !expanded()) return
    return listenForNaosOverlayEscape({
      onClose: () => api.setOpen(false),
      target: document,
    })
  })
  effect(() => {
    const api = hoverCardApi()
    if (api == null) return
    const trigger = host().root.querySelector("[part~='trigger']")
    const content = host().root.querySelector("[part~='content']")
    if (!(trigger instanceof HTMLElement) || !(content instanceof HTMLElement)) return
    const abort = new AbortController()
    const openCard = () => {
      if (!disabled) api.setOpen(true)
    }
    const closeCard = () => api.setOpen(false)
    trigger.addEventListener("pointerenter", (event) => {
      if (disabled || event.pointerType === "touch") return
      api.setOpen(true)
    }, { signal: abort.signal })
    trigger.addEventListener("pointermove", (event) => {
      if (disabled || event.pointerType === "touch") return
      api.setOpen(true)
    }, { signal: abort.signal })
    trigger.addEventListener("pointerleave", closeCard, { signal: abort.signal })
    trigger.addEventListener("focus", openCard, { signal: abort.signal })
    trigger.addEventListener("blur", closeCard, { signal: abort.signal })
    content.addEventListener("pointerenter", (event) => {
      if (disabled || event.pointerType === "touch") return
      api.setOpen(true)
    }, { signal: abort.signal })
    content.addEventListener("pointerleave", closeCard, { signal: abort.signal })
    return () => abort.abort()
  })

  return (
    <span
      part="root"
      {...getNaosOverlayStateAttributes({
        kind: "hover-card",
        open: isNaosPresenceOpen(presence()),
      })}
      {...getNaosPresenceAttributes(presence())}
      {...getNaosPresenceMotionAttributes()}
    >
      <button
        {...(hoverCardApi()?.getTriggerProps() ?? {})}
        part="trigger"
        type="button"
        disabled={disabled}
        data-state={expanded() ? "open" : "closed"}
        data-disabled={disabled || undefined}
      >
        <slot name="trigger">{label}</slot>
      </button>
      <span
        {...(hoverCardApi()?.getPositionerProps() ?? {})}
        part="positioner"
        {...getNaosOverlayStateAttributes({
          kind: "hover-card",
          open: isNaosPresenceOpen(presence()),
        })}
        {...getNaosPresenceAttributes(presence())}
        hidden={isNaosPresenceHidden(presence())}
      >
        <section
          {...(hoverCardApi()?.getContentProps() ?? {})}
          part="content"
          {...getNaosOverlayStateAttributes({
            kind: "hover-card",
            open: isNaosPresenceOpen(presence()),
          })}
          {...getNaosPresenceAttributes(presence())}
          hidden={isNaosPresenceHidden(presence())}
        >
          <h2 part="title">
            <slot name="title">{title}</slot>
          </h2>
          <div part="description">
            <slot>{text}</slot>
          </div>
        </section>
      </span>
    </span>
  )
}
