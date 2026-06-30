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
  collectNaosComboboxItems,
  createNaosZagComboboxService,
  getNaosZagComboboxApi,
  labelForNaosComboboxValue,
  stopNaosZagComboboxService,
  syncNaosComboboxItems,
} from "./internal/zag/combobox.js"
import type { NaosZagComboboxService } from "./internal/zag/combobox.js"
import { getNaosOverlayStateAttributes } from "./internal/behavior/overlay.js"
import css from "./combobox.wc.css?inline"

export type NaosComboboxProps = {
  disabled?: boolean
  label?: string
  name?: string
  placeholder?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosCombobox({
  disabled = false,
  label = "Options",
  name = "",
  placeholder = "Search options",
  value = "",
}: NaosComboboxProps = {}) {
  const selected = state(value)
  const input = state("")
  const open = state(false)
  const comboboxService = state<NaosZagComboboxService | null>(null)
  const comboboxApi = computed(() => getNaosZagComboboxApi(comboboxService()))
  const changed = event<{ value: string }>("naos-change")
  const inputChanged = event<{ inputValue: string }>("naos-input")
  const opened = event<{ open: boolean }>("naos-open-change")
  const form = formControl({
    value: () => selected() || null,
    reset: () => {
      const resetInputValue = value
        ? labelForNaosComboboxValue(host().element, value)
        : ""
      selected.set(value)
      input.set(resetInputValue)
      comboboxApi()?.setValue(value ? [value] : [])
      comboboxApi()?.setInputValue(resetInputValue)
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    const hostElement = host().element
    const initialInput = value ? labelForNaosComboboxValue(hostElement, value) : ""
    input.set(initialInput)
    comboboxService.set(createNaosZagComboboxService({
      disabled,
      host: hostElement,
      id: "naos-combobox",
      inputValue: initialInput,
      items: collectNaosComboboxItems(hostElement),
      name,
      onInputValueChange(nextValue) {
        input.set(nextValue)
        inputChanged.emit({ inputValue: nextValue })
      },
      onOpenChange(nextOpen) {
        open.set(nextOpen)
        opened.emit({ open: nextOpen })
      },
      onValueChange(nextValue) {
        selected.set(nextValue)
        changed.emit({ value: nextValue })
      },
      placeholder,
      root: host().root,
      value: selected(),
    }))
  })
  onDisconnected(() => {
    stopNaosZagComboboxService(comboboxService())
    comboboxService.set(null)
  })
  effect(() => {
    const api = comboboxApi()
    void selected()
    void input()
    void open()
    if (api == null) return
    return syncNaosComboboxItems({
      api,
      disabled,
      host: host().element,
      onRequestUpdate: () => host().update(),
    })
  })

  return (
    <section
      {...(comboboxApi()?.getRootProps() ?? {})}
      part="root"
      {...getNaosOverlayStateAttributes({
        kind: "combobox",
        open: open(),
      })}
      data-disabled={disabled || undefined}
    >
      <label {...(comboboxApi()?.getLabelProps() ?? {})} part="label">
        {label}
      </label>
      <div {...(comboboxApi()?.getControlProps() ?? {})} part="control">
        <input
          {...(comboboxApi()?.getInputProps() ?? {})}
          part="input"
          data-state={open() ? "open" : "closed"}
        />
        <button
          {...(comboboxApi()?.getTriggerProps() ?? {})}
          part="trigger"
          data-state={open() ? "open" : "closed"}
        >
          v
        </button>
      </div>
      <div
        {...(comboboxApi()?.getPositionerProps() ?? {})}
        part="positioner"
        {...getNaosOverlayStateAttributes({
          kind: "combobox",
          open: open(),
        })}
      >
        <div
          {...(comboboxApi()?.getContentProps() ?? {})}
          part="content"
          {...getNaosOverlayStateAttributes({
            kind: "combobox",
            open: open(),
          })}
        >
          <div {...(comboboxApi()?.getListProps() ?? {})} part="list">
            <slot name="item" />
          </div>
        </div>
      </div>
    </section>
  )
}
