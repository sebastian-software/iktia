import {
  computed,
  event,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@iktia/core"
import {
  createIktiaZagCollapsibleService,
  getIktiaZagCollapsibleApi,
  stopIktiaZagCollapsibleService,
} from "./internal/zag/collapsible.js"
import type { IktiaZagCollapsibleService } from "./internal/zag/collapsible.js"
import css from "./collapsible.wc.css?inline"

export type IktiaCollapsibleProps = {
  disabled?: boolean
  label?: string
  open?: boolean
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaCollapsible({
  disabled = false,
  label = "Details",
  open = false,
}: IktiaCollapsibleProps = {}) {
  const expanded = state(open)
  const collapsibleService = state<IktiaZagCollapsibleService | null>(null)
  const collapsibleApi = computed(() =>
    getIktiaZagCollapsibleApi(collapsibleService())
  )
  const changed = event<{ open: boolean }>("iktia-open-change")

  onConnected(() => {
    collapsibleService.set(createIktiaZagCollapsibleService({
      disabled,
      host: host().element,
      id: "iktia-collapsible",
      onOpenChange(nextOpen) {
        expanded.set(nextOpen)
        changed.emit({ open: nextOpen })
      },
      open: expanded(),
      root: host().root,
    }))
  })
  onDisconnected(() => {
    stopIktiaZagCollapsibleService(collapsibleService())
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
