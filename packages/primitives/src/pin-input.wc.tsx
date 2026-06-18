import {
  computed,
  event,
  formControl,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@iktia/core"
import {
  createIktiaZagPinInputService,
  getIktiaZagPinInputApi,
  pinInputValueArray,
  stopIktiaZagPinInputService,
} from "./internal/zag/pin-input.js"
import type {
  IktiaZagPinInputService,
  IktiaZagPinInputType,
} from "./internal/zag/pin-input.js"
import css from "./pin-input.wc.css?inline"

export type IktiaPinInputProps = {
  count?: number
  disabled?: boolean
  label?: string
  mask?: boolean
  name?: string
  otp?: boolean
  placeholder?: string
  type?: IktiaZagPinInputType
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaPinInput({
  count = 4,
  disabled = false,
  label = "Code",
  mask = false,
  name = "",
  otp = false,
  placeholder = "○",
  type = "numeric",
  value = "",
}: IktiaPinInputProps = {}) {
  const current = state(value)
  const complete = state(value.length >= count)
  const pinInputService = state<IktiaZagPinInputService | null>(null)
  const pinInputApi = computed(() => getIktiaZagPinInputApi(pinInputService()))
  const changed = event<{ complete: boolean; value: string }>("iktia-change")
  const completed = event<{ value: string }>("iktia-complete")
  const invalid = event<{ index: number; value: string }>("iktia-invalid")
  const form = formControl({
    value: () => current(),
    reset: () => {
      current.set(value)
      complete.set(value.length >= count)
      pinInputApi()?.setValue(pinInputValueArray(value, count))
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    pinInputService.set(createIktiaZagPinInputService({
      count,
      disabled,
      host: host().element,
      id: "iktia-pin-input",
      label,
      mask,
      onValueChange(details) {
        const nextComplete = details.valueAsString.length >= count

        changed.emit({ complete: nextComplete, value: details.valueAsString })
        queueMicrotask(() => {
          current.set(details.valueAsString)
          complete.set(nextComplete)
        })
      },
      onValueComplete(details) {
        completed.emit({ value: details.valueAsString })
        queueMicrotask(() => {
          complete.set(true)
        })
      },
      onValueInvalid(details) {
        invalid.emit(details)
      },
      otp,
      placeholder,
      root: host().root,
      type,
      value,
    }))
  })
  onDisconnected(() => {
    stopIktiaZagPinInputService(pinInputService())
    pinInputService.set(null)
  })

  return (
    <section
      {...(pinInputApi()?.getRootProps() ?? {})}
      part="root"
      data-state={complete() ? "complete" : "incomplete"}
      data-disabled={disabled || undefined}
      data-value={current()}
    >
      <label {...(pinInputApi()?.getLabelProps() ?? {})} part="label">
        {label}
      </label>
      <input
        {...(pinInputApi()?.getHiddenInputProps() ?? {})}
        name={undefined}
        value={current()}
      />
      <div {...(pinInputApi()?.getControlProps() ?? {})} part="control">
        {(pinInputApi()?.items ?? []).map((itemIndex) => (
          <input
            key={String(itemIndex)}
            {...(pinInputApi()?.getInputProps({ index: itemIndex }) ?? {})}
            part="input"
            name={undefined}
            value={pinInputApi()?.value[itemIndex] ?? ""}
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  )
}
