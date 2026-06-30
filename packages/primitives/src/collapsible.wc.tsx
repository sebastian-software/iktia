import {
  computed,
  event,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import {
  createNaosZagCollapsibleService,
  getNaosZagCollapsibleApi,
  stopNaosZagCollapsibleService,
} from "./internal/zag/collapsible.js"
import type { NaosZagCollapsibleService } from "./internal/zag/collapsible.js"
import css from "./collapsible.wc.css?inline"

export type NaosCollapsibleProps = {
  disabled?: boolean
  label?: string
  open?: boolean
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosCollapsible({
  disabled = false,
  label = "Details",
  open = false,
}: NaosCollapsibleProps = {}) {
  const expanded = state(open)
  const collapsibleService = state<NaosZagCollapsibleService | null>(null)
  const collapsibleApi = computed(() =>
    getNaosZagCollapsibleApi(collapsibleService())
  )
  const changed = event<{ open: boolean }>("naos-open-change")

  onConnected(() => {
    collapsibleService.set(createNaosZagCollapsibleService({
      disabled,
      host: host().element,
      id: "naos-collapsible",
      onOpenChange(nextOpen) {
        expanded.set(nextOpen)
        changed.emit({ open: nextOpen })
      },
      open: expanded(),
      root: host().root,
    }))
  })
  onDisconnected(() => {
    stopNaosZagCollapsibleService(collapsibleService())
    collapsibleService.set(null)
  })

  return (
    <div
      {...(collapsibleApi()?.getRootProps() ?? {})}
      part="root"
      data-state={expanded() ? "open" : "closed"}
      data-disabled={disabled || undefined}
    >
      <button
        {...(collapsibleApi()?.getTriggerProps() ?? {})}
        part="trigger"
        aria-expanded={expanded() ? "true" : "false"}
        disabled={disabled}
        data-state={expanded() ? "open" : "closed"}
      >
        <span
          {...(collapsibleApi()?.getIndicatorProps() ?? {})}
          part="indicator"
          aria-hidden="true"
          data-state={expanded() ? "open" : "closed"}
        >
          {expanded() ? "-" : "+"}
        </span>
        <span part="label">
          <slot name="trigger">{label}</slot>
        </span>
      </button>
      <div
        {...(collapsibleApi()?.getContentProps() ?? {})}
        part="content"
        data-state={expanded() ? "open" : "closed"}
      >
        <slot />
      </div>
    </div>
  )
}
