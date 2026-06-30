import {
  computed,
  effect,
  event,
  formControl,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import {
  collectNaosSelectItems,
  createNaosZagSelectService,
  getNaosZagSelectApi,
  labelForNaosSelectValue,
  stopNaosZagSelectService,
  syncNaosSelectItems,
} from "./internal/zag/select.js"
import type { NaosZagSelectService } from "./internal/zag/select.js"
import { getNaosOverlayStateAttributes } from "./internal/behavior/overlay.js"
import css from "./select.wc.css?inline"

export type NaosSelectProps = {
  disabled?: boolean
  label?: string
  name?: string
  placeholder?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosSelect({
  disabled = false,
  label = "Options",
  name = "",
  placeholder = "Select an option",
  value = "",
}: NaosSelectProps = {}) {
  const selected = state(value)
  const open = state(false)
  const selectService = state<NaosZagSelectService | null>(null)
  const selectApi = computed(() => getNaosZagSelectApi(selectService()))
  const selectedLabel = computed(() =>
    selected() ? labelForNaosSelectValue(host().element, selected()) : ""
  )
  const changed = event<{ value: string }>("naos-change")
  const opened = event<{ open: boolean }>("naos-open-change")
  const form = formControl({
    value: () => selected() || null,
    reset: () => {
      selected.set(value)
      selectApi()?.setValue(value ? [value] : [])
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    const hostElement = host().element
    selectService.set(createNaosZagSelectService({
      disabled,
      host: hostElement,
      id: "naos-select",
      items: collectNaosSelectItems(hostElement),
      name,
      onOpenChange(nextOpen) {
        open.set(nextOpen)
        opened.emit({ open: nextOpen })
      },
      onValueChange(nextValue) {
        selected.set(nextValue)
        changed.emit({ value: nextValue })
      },
      root: host().root,
      value: selected(),
    }))
  })
  onDisconnected(() => {
    stopNaosZagSelectService(selectService())
    selectService.set(null)
  })
  effect(() => {
    const api = selectApi()
    void selected()
    void open()
    if (api == null) return
    return syncNaosSelectItems({
      api,
      disabled,
      host: host().element,
      onRequestUpdate: () => host().update(),
    })
  })

  return (
    <section
      {...(selectApi()?.getRootProps() ?? {})}
      part="root"
      data-disabled={disabled || undefined}
      {...getNaosOverlayStateAttributes({
        kind: "select",
        open: open(),
      })}
    >
      <span {...(selectApi()?.getLabelProps() ?? {})} part="label">
        {label}
      </span>
      <div {...(selectApi()?.getControlProps() ?? {})} part="control">
        <button
          {...(selectApi()?.getTriggerProps() ?? {})}
          part="trigger"
          data-state={open() ? "open" : "closed"}
        >
          <span part="value">
            {selectedLabel() || placeholder}
          </span>
          <span {...(selectApi()?.getIndicatorProps() ?? {})} part="indicator">
            v
          </span>
        </button>
      </div>
      <div
        {...(selectApi()?.getPositionerProps() ?? {})}
        part="positioner"
        {...getNaosOverlayStateAttributes({
          kind: "select",
          open: open(),
        })}
      >
        <div
          {...(selectApi()?.getContentProps() ?? {})}
          part="content"
          {...getNaosOverlayStateAttributes({
            kind: "select",
            open: open(),
          })}
        >
          <div {...(selectApi()?.getListProps() ?? {})} part="list">
            <slot name="item" />
          </div>
        </div>
      </div>
    </section>
  )
}
