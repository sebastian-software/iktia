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
} from "@iktia/core"
import {
  collectIktiaSelectItems,
  createIktiaZagSelectService,
  getIktiaZagSelectApi,
  labelForIktiaSelectValue,
  stopIktiaZagSelectService,
  syncIktiaSelectItems,
} from "./internal/zag/select.js"
import type { IktiaZagSelectService } from "./internal/zag/select.js"
import { getIktiaOverlayStateAttributes } from "./internal/behavior/overlay.js"
import css from "./select.wc.css?inline"

export type IktiaSelectProps = {
  disabled?: boolean
  label?: string
  name?: string
  placeholder?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaSelect({
  disabled = false,
  label = "Options",
  name = "",
  placeholder = "Select an option",
  value = "",
}: IktiaSelectProps = {}) {
  const selected = state(value)
  const open = state(false)
  const selectService = state<IktiaZagSelectService | null>(null)
  const selectApi = computed(() => getIktiaZagSelectApi(selectService()))
  const selectedLabel = computed(() =>
    selected() ? labelForIktiaSelectValue(host().element, selected()) : ""
  )
  const changed = event<{ value: string }>("iktia-change")
  const opened = event<{ open: boolean }>("iktia-open-change")
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
    selectService.set(createIktiaZagSelectService({
      disabled,
      host: hostElement,
      id: "iktia-select",
      items: collectIktiaSelectItems(hostElement),
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
    stopIktiaZagSelectService(selectService())
    selectService.set(null)
  })
  effect(() => {
    const api = selectApi()
    void selected()
    void open()
    if (api == null) return
    return syncIktiaSelectItems({
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
      {...getIktiaOverlayStateAttributes({
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
        {...getIktiaOverlayStateAttributes({
          kind: "select",
          open: open(),
        })}
      >
        <div
          {...(selectApi()?.getContentProps() ?? {})}
          part="content"
          {...getIktiaOverlayStateAttributes({
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
