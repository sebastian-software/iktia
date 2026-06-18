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
  collectIktiaComboboxItems,
  createIktiaZagComboboxService,
  getIktiaZagComboboxApi,
  labelForIktiaComboboxValue,
  stopIktiaZagComboboxService,
  syncIktiaComboboxItems,
} from "./internal/zag/combobox.js"
import type { IktiaZagComboboxService } from "./internal/zag/combobox.js"
import css from "./combobox.wc.css?inline"

export type IktiaComboboxProps = {
  disabled?: boolean
  label?: string
  name?: string
  placeholder?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaCombobox({
  disabled = false,
  label = "Options",
  name = "",
  placeholder = "Search options",
  value = "",
}: IktiaComboboxProps = {}) {
  const selected = state(value)
  const input = state("")
  const open = state(false)
  const comboboxService = state<IktiaZagComboboxService | null>(null)
  const comboboxApi = computed(() => getIktiaZagComboboxApi(comboboxService()))
  const changed = event<{ value: string }>("iktia-change")
  const inputChanged = event<{ inputValue: string }>("iktia-input")
  const opened = event<{ open: boolean }>("iktia-open-change")
  const form = formControl({
    value: () => selected() || null,
    reset: () => {
      const resetInputValue = value
        ? labelForIktiaComboboxValue(host().element, value)
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
    const initialInput = value ? labelForIktiaComboboxValue(hostElement, value) : ""
    input.set(initialInput)
    comboboxService.set(createIktiaZagComboboxService({
      disabled,
      host: hostElement,
      id: "iktia-combobox",
      inputValue: initialInput,
      items: collectIktiaComboboxItems(hostElement),
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
    stopIktiaZagComboboxService(comboboxService())
    comboboxService.set(null)
  })
  effect(() => {
    const api = comboboxApi()
    void selected()
    void input()
    void open()
    if (api == null) return
    return syncIktiaComboboxItems({
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
      data-state={open() ? "open" : "closed"}
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
      <div {...(comboboxApi()?.getPositionerProps() ?? {})} part="positioner">
        <div
          {...(comboboxApi()?.getContentProps() ?? {})}
          part="content"
          data-state={open() ? "open" : "closed"}
        >
          <div {...(comboboxApi()?.getListProps() ?? {})} part="list">
            <slot name="item" />
          </div>
        </div>
      </div>
    </section>
  )
}
