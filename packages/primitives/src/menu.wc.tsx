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
  createNaosZagMenuService,
  getNaosZagMenuApi,
  stopNaosZagMenuService,
  syncNaosMenuItems,
} from "./internal/zag/menu.js"
import type { NaosZagMenuService } from "./internal/zag/menu.js"
import {
  getNaosOverlayStateAttributes,
  listenForNaosOverlayEscape,
} from "./internal/behavior/overlay.js"
import css from "./menu.wc.css?inline"

export type NaosMenuProps = {
  disabled?: boolean
  label?: string
  open?: boolean
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosMenu({
  disabled = false,
  label = "Actions",
  open = false,
}: NaosMenuProps = {}) {
  const expanded = state(open)
  const highlighted = state<string | null>(null)
  const menuService = state<NaosZagMenuService | null>(null)
  const menuApi = computed(() => getNaosZagMenuApi(menuService()))
  const opened = event<{ open: boolean }>("naos-open-change")
  const selected = event<{ value: string }>("naos-select")

  onConnected(() => {
    const hostElement = host().element
    menuService.set(createNaosZagMenuService({
      disabled,
      host: hostElement,
      id: "naos-menu",
      label,
      onHighlightChange(nextValue) {
        highlighted.set(nextValue)
      },
      onOpenChange(nextOpen) {
        expanded.set(nextOpen)
        opened.emit({ open: nextOpen })
      },
      root: host().root,
    }))
    if (open) menuApi()?.setOpen(true)
  })
  onDisconnected(() => {
    stopNaosZagMenuService(menuService())
    menuService.set(null)
  })
  effect(() => {
    const api = menuApi()
    void expanded()
    void highlighted()
    if (api == null) return
    return syncNaosMenuItems({
      api,
      disabled,
      host: host().element,
      onRequestUpdate: () => host().update(),
      onSelect(value) {
        selected.emit({ value })
      },
    })
  })
  effect(() => {
    const api = menuApi()
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
      data-disabled={disabled || undefined}
      {...getNaosOverlayStateAttributes({
        kind: "menu",
        open: expanded(),
      })}
    >
      <button
        {...(menuApi()?.getTriggerProps() ?? {})}
        part="trigger"
        data-state={expanded() ? "open" : "closed"}
        disabled={disabled}
      >
        <slot name="trigger">{label}</slot>
      </button>
      <div
        {...(menuApi()?.getPositionerProps() ?? {})}
        part="positioner"
        {...getNaosOverlayStateAttributes({
          kind: "menu",
          open: expanded(),
        })}
      >
        <div
          {...(menuApi()?.getContentProps() ?? {})}
          part="content"
          {...getNaosOverlayStateAttributes({
            kind: "menu",
            open: expanded(),
          })}
        >
          <slot name="item" />
        </div>
      </div>
    </div>
  )
}
