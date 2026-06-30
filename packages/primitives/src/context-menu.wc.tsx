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
import css from "./context-menu.wc.css?inline"

export type NaosContextMenuProps = {
  disabled?: boolean
  label?: string
  open?: boolean
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosContextMenu({
  disabled = false,
  label = "Context menu",
  open = false,
}: NaosContextMenuProps = {}) {
  const expanded = state(open)
  const highlighted = state<string | null>(null)
  const menuService = state<NaosZagMenuService | null>(null)
  const contextMenuApi = computed(() => getNaosZagMenuApi(menuService()))
  const opened = event<{ open: boolean }>("naos-open-change")
  const selected = event<{ value: string }>("naos-select")

  onConnected(() => {
    const hostElement = host().element
    menuService.set(createNaosZagMenuService({
      disabled,
      host: hostElement,
      id: "naos-context-menu",
      label,
      onHighlightChange(nextValue) {
        highlighted.set(nextValue)
      },
      onOpenChange(nextOpen) {
        expanded.set(nextOpen)
        opened.emit({ open: nextOpen })
      },
      positioning: { placement: "bottom-start" },
      root: host().root,
    }))
    if (open) contextMenuApi()?.setOpen(true)
  })
  onDisconnected(() => {
    stopNaosZagMenuService(menuService())
    menuService.set(null)
  })
  effect(() => {
    const api = contextMenuApi()
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
    const api = contextMenuApi()
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
        kind: "context-menu",
        open: expanded(),
      })}
    >
      <div
        {...(disabled ? {} : contextMenuApi()?.getContextTriggerProps() ?? {})}
        part="trigger"
        tabindex={disabled ? undefined : 0}
        data-state={expanded() ? "open" : "closed"}
      >
        <slot name="trigger">{label}</slot>
      </div>
      <div
        {...(contextMenuApi()?.getPositionerProps() ?? {})}
        part="positioner"
        {...getNaosOverlayStateAttributes({
          kind: "context-menu",
          open: expanded(),
        })}
      >
        <div
          {...(contextMenuApi()?.getContentProps() ?? {})}
          part="content"
          {...getNaosOverlayStateAttributes({
            kind: "context-menu",
            open: expanded(),
          })}
        >
          <slot name="item" />
        </div>
      </div>
    </div>
  )
}
