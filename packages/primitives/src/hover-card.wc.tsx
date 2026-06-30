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
  createIktiaZagHoverCardService,
  getIktiaZagHoverCardApi,
  stopIktiaZagHoverCardService,
} from "./internal/zag/hover-card.js"
import type { IktiaZagHoverCardService } from "./internal/zag/hover-card.js"
import {
  getIktiaOverlayStateAttributes,
  listenForIktiaOverlayEscape,
} from "./internal/behavior/overlay.js"
import {
  createIktiaPresenceSnapshot,
  getIktiaPresenceAttributes,
  getIktiaPresenceMotionAttributes,
  isIktiaPresenceHidden,
  isIktiaPresenceOpen,
  nextIktiaPresenceSnapshot,
  scheduleIktiaPresenceFrame,
  settleIktiaPresenceSnapshot,
  waitForIktiaPresenceExit,
} from "./internal/behavior/presence.js"
import css from "./hover-card.wc.css?inline"

export type IktiaHoverCardProps = {
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

export function IktiaHoverCard({
  closeDelay = 0,
  disabled = false,
  label = "Preview",
  open = false,
  openDelay = 0,
  text = "Additional details",
  title = "Details",
}: IktiaHoverCardProps = {}) {
  const expanded = state(open)
  const presence = state(createIktiaPresenceSnapshot(open))
  const hoverCardService = state<IktiaZagHoverCardService | null>(null)
  const hoverCardApi = computed(() => getIktiaZagHoverCardApi(hoverCardService()))
  const changed = event<{ open: boolean }>("iktia-open-change")

  onConnected(() => {
    hoverCardService.set(createIktiaZagHoverCardService({
      closeDelay,
      disabled,
      host: host().element,
      id: "iktia-hover-card",
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
    stopIktiaZagHoverCardService(hoverCardService())
    hoverCardService.set(null)
  })
  effect(() => {
    const next = nextIktiaPresenceSnapshot(presence(), expanded())
    if (next !== presence()) presence.set(next)
  })
  effect(() => {
    const snapshot = presence()
    if (snapshot.phase === "entering") {
      return scheduleIktiaPresenceFrame(() => {
        if (expanded()) {
          presence.set(settleIktiaPresenceSnapshot(presence(), true))
        }
      })
    }
    if (snapshot.phase !== "closing") return
    const content = host().root.querySelector("[part~='content']")
    return waitForIktiaPresenceExit(
      content instanceof Element ? content : null,
      () => {
        if (!expanded()) {
          presence.set(settleIktiaPresenceSnapshot(presence(), false))
        }
      }
    )
  })
  effect(() => {
    const api = hoverCardApi()
    void expanded()
    if (api == null || !expanded()) return
    return listenForIktiaOverlayEscape({
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
      {...getIktiaOverlayStateAttributes({
        kind: "hover-card",
        open: isIktiaPresenceOpen(presence()),
      })}
      {...getIktiaPresenceAttributes(presence())}
      {...getIktiaPresenceMotionAttributes()}
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
        {...getIktiaOverlayStateAttributes({
          kind: "hover-card",
          open: isIktiaPresenceOpen(presence()),
        })}
        {...getIktiaPresenceAttributes(presence())}
        hidden={isIktiaPresenceHidden(presence())}
      >
        <section
          {...(hoverCardApi()?.getContentProps() ?? {})}
          part="content"
          {...getIktiaOverlayStateAttributes({
            kind: "hover-card",
            open: isIktiaPresenceOpen(presence()),
          })}
          {...getIktiaPresenceAttributes(presence())}
          hidden={isIktiaPresenceHidden(presence())}
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
