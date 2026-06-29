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
  createIktiaZagTooltipService,
  getIktiaZagTooltipApi,
  stopIktiaZagTooltipService,
} from "./internal/zag/tooltip.js"
import type { IktiaZagTooltipService } from "./internal/zag/tooltip.js"
import {
  getIktiaOverlayStateAttributes,
  listenForIktiaOverlayEscape,
} from "./internal/behavior/overlay.js"
import css from "./tooltip.wc.css?inline"

export type IktiaTooltipProps = {
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

export function IktiaTooltip({
  closeDelay = 0,
  disabled = false,
  label = "Help",
  open = false,
  openDelay = 0,
  text = "More information",
}: IktiaTooltipProps = {}) {
  const expanded = state(open)
  const tooltipService = state<IktiaZagTooltipService | null>(null)
  const tooltipApi = computed(() => getIktiaZagTooltipApi(tooltipService()))
  const changed = event<{ open: boolean }>("iktia-open-change")

  onConnected(() => {
    tooltipService.set(createIktiaZagTooltipService({
      closeDelay,
      disabled,
      host: host().element,
      id: "iktia-tooltip",
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
    stopIktiaZagTooltipService(tooltipService())
    tooltipService.set(null)
  })
  effect(() => {
    const api = tooltipApi()
    void expanded()
    if (api == null || !expanded()) return
    return listenForIktiaOverlayEscape({
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
      {...getIktiaOverlayStateAttributes({
        kind: "tooltip",
        open: expanded(),
      })}
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
        {...getIktiaOverlayStateAttributes({
          kind: "tooltip",
          open: expanded(),
        })}
      >
        <span
          {...(tooltipApi()?.getContentProps() ?? {})}
          part="content"
          {...getIktiaOverlayStateAttributes({
            kind: "tooltip",
            open: expanded(),
          })}
        >
          <slot>{text}</slot>
        </span>
      </span>
    </span>
  )
}
