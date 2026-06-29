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
  createIktiaZagMenuService,
  getIktiaZagMenuApi,
  stopIktiaZagMenuService,
  syncIktiaMenuItems,
} from "./internal/zag/menu.js"
import type { IktiaZagMenuService } from "./internal/zag/menu.js"
import {
  getIktiaOverlayStateAttributes,
  listenForIktiaOverlayEscape,
} from "./internal/behavior/overlay.js"
import css from "./context-menu.wc.css?inline"

export type IktiaContextMenuProps = {
  disabled?: boolean
  label?: string
  open?: boolean
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaContextMenu({
  disabled = false,
  label = "Context menu",
  open = false,
}: IktiaContextMenuProps = {}) {
  const expanded = state(open)
  const highlighted = state<string | null>(null)
  const menuService = state<IktiaZagMenuService | null>(null)
  const contextMenuApi = computed(() => getIktiaZagMenuApi(menuService()))
  const opened = event<{ open: boolean }>("iktia-open-change")
  const selected = event<{ value: string }>("iktia-select")

  onConnected(() => {
    const hostElement = host().element
    menuService.set(createIktiaZagMenuService({
      disabled,
      host: hostElement,
      id: "iktia-context-menu",
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
    stopIktiaZagMenuService(menuService())
    menuService.set(null)
  })
  effect(() => {
    const api = contextMenuApi()
    void expanded()
    void highlighted()
    if (api == null) return
    return syncIktiaMenuItems({
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
    return listenForIktiaOverlayEscape({
      onClose: () => api.setOpen(false),
      target: document,
    })
  })

  return (
    <div
      part="root"
      data-disabled={disabled || undefined}
      {...getIktiaOverlayStateAttributes({
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
        {...getIktiaOverlayStateAttributes({
          kind: "context-menu",
          open: expanded(),
        })}
      >
        <div
          {...(contextMenuApi()?.getContentProps() ?? {})}
          part="content"
          {...getIktiaOverlayStateAttributes({
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
