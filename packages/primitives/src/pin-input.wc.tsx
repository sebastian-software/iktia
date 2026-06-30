import {
  computed,
  event,
  formControl,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import {
  createNaosZagPinInputService,
  getNaosZagPinInputApi,
  pinInputValueArray,
  stopNaosZagPinInputService,
} from "./internal/zag/pin-input.js"
import type {
  NaosZagPinInputService,
  NaosZagPinInputType,
} from "./internal/zag/pin-input.js"
import css from "./pin-input.wc.css?inline"

export type NaosPinInputProps = {
  count?: number
  disabled?: boolean
  label?: string
  mask?: boolean
  name?: string
  otp?: boolean
  placeholder?: string
  type?: NaosZagPinInputType
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosPinInput({
  count = 4,
  disabled = false,
  label = "Code",
  mask = false,
  name = "",
  otp = false,
  placeholder = "○",
  type = "numeric",
  value = "",
}: NaosPinInputProps = {}) {
  const current = state(value)
  const complete = state(value.length >= count)
  const pinInputService = state<NaosZagPinInputService | null>(null)
  const pinInputApi = computed(() => getNaosZagPinInputApi(pinInputService()))
  const changed = event<{ complete: boolean; value: string }>("naos-change")
  const completed = event<{ value: string }>("naos-complete")
  const invalid = event<{ index: number; value: string }>("naos-invalid")
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
    pinInputService.set(createNaosZagPinInputService({
      count,
      disabled,
      host: host().element,
      id: "naos-pin-input",
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
    stopNaosZagPinInputService(pinInputService())
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
