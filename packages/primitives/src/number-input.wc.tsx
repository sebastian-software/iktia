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
  createNaosZagNumberInputService,
  getNaosZagNumberInputApi,
  stopNaosZagNumberInputService,
} from "./internal/zag/number-input.js"
import type { NaosZagNumberInputService } from "./internal/zag/number-input.js"
import css from "./number-input.wc.css?inline"

export type NaosNumberInputProps = {
  disabled?: boolean
  label?: string
  max?: number
  min?: number
  name?: string
  step?: number
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosNumberInput({
  disabled = false,
  label = "Number",
  max = 100,
  min = 0,
  name = "",
  step = 1,
  value = "",
}: NaosNumberInputProps = {}) {
  const current = state(value)
  const numeric = state(Number(value))
  const numberInputService = state<NaosZagNumberInputService | null>(null)
  const numberInputApi = computed(() => getNaosZagNumberInputApi(numberInputService()))
  const changed = event<{ value: string; valueAsNumber: number }>("naos-change")
  const form = formControl({
    value: () => current(),
    reset: () => {
      current.set(value)
      numeric.set(Number(value))
      if (value === "") {
        numberInputApi()?.clearValue()
      } else {
        numberInputApi()?.setValue(Number(value))
      }
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    numberInputService.set(createNaosZagNumberInputService({
      disabled,
      host: host().element,
      id: "naos-number-input",
      label,
      max,
      min,
      onValueChange(details) {
        current.set(details.value)
        numeric.set(details.valueAsNumber)
        changed.emit(details)
      },
      root: host().root,
      step,
      value,
    }))
  })
  onDisconnected(() => {
    stopNaosZagNumberInputService(numberInputService())
    numberInputService.set(null)
  })

  return (
    <section
      {...(numberInputApi()?.getRootProps() ?? {})}
      part="root"
      data-state={current() === "" ? "empty" : "filled"}
      data-disabled={disabled || undefined}
      data-invalid={numberInputApi()?.invalid || undefined}
    >
      <label {...(numberInputApi()?.getLabelProps() ?? {})} part="label">
        {label}
      </label>
      <div {...(numberInputApi()?.getControlProps() ?? {})} part="control">
        <button
          {...(numberInputApi()?.getDecrementTriggerProps() ?? {})}
          part="decrement"
        >
          -
        </button>
        <input
          {...(numberInputApi()?.getInputProps() ?? {})}
          part="input"
          name={undefined}
          value={current()}
          disabled={disabled}
        />
        <button
          {...(numberInputApi()?.getIncrementTriggerProps() ?? {})}
          part="increment"
        >
          +
        </button>
      </div>
      <output {...(numberInputApi()?.getValueTextProps() ?? {})} part="value">
        {Number.isNaN(numeric()) ? "" : current()}
      </output>
    </section>
  )
}
