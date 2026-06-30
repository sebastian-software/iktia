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
  createNaosZagDialogService,
  getNaosZagDialogApi,
  stopNaosZagDialogService,
} from "./internal/zag/dialog.js"
import type { NaosZagDialogService } from "./internal/zag/dialog.js"
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
import css from "./dialog.wc.css?inline"

export type NaosDialogProps = {
  description?: string
  label?: string
  modal?: boolean
  open?: boolean
  title?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosDialog({
  description = "Dialog content",
  label = "Open dialog",
  modal = true,
  open = false,
  title = "Dialog",
}: NaosDialogProps = {}) {
  const expanded = state(open)
  const presence = state(createNaosPresenceSnapshot(open))
  const dialogService = state<NaosZagDialogService | null>(null)
  const dialogApi = computed(() => getNaosZagDialogApi(dialogService()))
  const changed = event<{ open: boolean }>("naos-open-change")

  onConnected(() => {
    dialogService.set(createNaosZagDialogService({
      host: host().element,
      id: "naos-dialog",
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
    stopNaosZagDialogService(dialogService())
    dialogService.set(null)
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
    const cleanupEscape = listenForNaosOverlayEscape({
      onClose: closeDialog,
      target: document,
    })
    document.addEventListener("pointerdown", (event) => {
      const path = event.composedPath()
      if (content != null && path.includes(content)) return
      if (trigger != null && path.includes(trigger)) return
      closeDialog()
    }, { capture: true, signal: abort.signal })
    return () => {
      cleanupEscape()
      abort.abort()
    }
  })

  return (
    <div
      part="root"
      {...getNaosOverlayStateAttributes({
        kind: "dialog",
        modal,
        open: isNaosPresenceOpen(presence()),
      })}
      {...getNaosPresenceAttributes(presence())}
      {...getNaosPresenceMotionAttributes()}
    >
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
        {...getNaosOverlayStateAttributes({
          kind: "dialog",
          modal,
          open: isNaosPresenceOpen(presence()),
        })}
        {...getNaosPresenceAttributes(presence())}
        hidden={isNaosPresenceHidden(presence())}
      />
      <div
        {...(dialogApi()?.getPositionerProps() ?? {})}
        part="positioner"
        {...getNaosOverlayStateAttributes({
          kind: "dialog",
          modal,
          open: isNaosPresenceOpen(presence()),
        })}
        {...getNaosPresenceAttributes(presence())}
        hidden={isNaosPresenceHidden(presence())}
      >
        <section
          {...(dialogApi()?.getContentProps() ?? {})}
          part="content"
          aria-modal={modal ? "true" : undefined}
          {...getNaosOverlayStateAttributes({
            kind: "dialog",
            modal,
            open: isNaosPresenceOpen(presence()),
          })}
          {...getNaosPresenceAttributes(presence())}
          hidden={isNaosPresenceHidden(presence())}
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
