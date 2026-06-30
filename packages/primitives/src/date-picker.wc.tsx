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
  createNaosZagDatePickerService,
  datePickerDays,
  datePickerFormValue,
  datePickerValueArray,
  datePickerValueString,
  getNaosZagDatePickerApi,
  stopNaosZagDatePickerService,
} from "./internal/zag/date-picker.js"
import type { NaosZagDatePickerService } from "./internal/zag/date-picker.js"
import css from "./date-picker.wc.css?inline"

export type NaosDatePickerProps = {
  disabled?: boolean
  label?: string
  locale?: string
  name?: string
  placeholder?: string
  readOnly?: boolean
  required?: boolean
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosDatePicker({
  disabled = false,
  label = "Date",
  locale = "en-US",
  name = "",
  placeholder = "mm/dd/yyyy",
  readOnly = false,
  required = false,
  value = "",
}: NaosDatePickerProps = {}) {
  const current = state(datePickerValueString(datePickerValueArray(value)))
  const focused = state("")
  const opened = state(false)
  const datePickerService = state<NaosZagDatePickerService | null>(null)
  const datePickerApi = computed(() => getNaosZagDatePickerApi(datePickerService()))
  const changed = event<{ value: string }>("naos-change")
  const focusChanged = event<{ focusedValue: string }>("naos-focus-change")
  const openChanged = event<{ open: boolean }>("naos-open-change")
  const form = formControl({
    value: () => datePickerFormValue(current()),
    reset: () => {
      const resetValue = datePickerValueArray(value)
      current.set(datePickerValueString(resetValue))
      datePickerApi()?.setValue(resetValue)
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    datePickerService.set(createNaosZagDatePickerService({
      disabled,
      host: host().element,
      id: "naos-date-picker",
      label,
      locale,
      name,
      onFocusChange(details) {
        const nextFocusedValue = details.focusedValue.toString()
        focused.set(nextFocusedValue)
        focusChanged.emit({ focusedValue: nextFocusedValue })
      },
      onOpenChange(details) {
        opened.set(details.open)
        openChanged.emit({ open: details.open })
      },
      onValueChange(details) {
        const nextValue = datePickerValueString(details.value)
        current.set(nextValue)
        changed.emit({ value: nextValue })
      },
      placeholder,
      readOnly,
      required,
      root: host().root,
      value: current(),
    }))
  })
  onDisconnected(() => {
    stopNaosZagDatePickerService(datePickerService())
    datePickerService.set(null)
  })

  return (
    <section
      {...(datePickerApi()?.getRootProps() ?? {})}
      part="root"
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      data-state={opened() ? "open" : "closed"}
      data-value={current()}
      data-focused-value={focused()}
    >
      <label {...(datePickerApi()?.getLabelProps() ?? {})} part="label">
        {label}
      </label>
      <div {...(datePickerApi()?.getControlProps() ?? {})} part="control">
        <input
          {...(datePickerApi()?.getInputProps() ?? {})}
          part="input"
          name={undefined}
          value={datePickerApi()?.valueAsString[0] ?? current()}
          disabled={disabled}
        />
        <button {...(datePickerApi()?.getTriggerProps() ?? {})} part="trigger">
          Pick
        </button>
        <button {...(datePickerApi()?.getClearTriggerProps() ?? {})} part="clear">
          Clear
        </button>
      </div>
      <div {...(datePickerApi()?.getPositionerProps() ?? {})} part="positioner">
        <div
          {...(datePickerApi()?.getContentProps() ?? {})}
          part="content"
          data-state={opened() ? "open" : "closed"}
        >
          <div part="header">
            <button {...(datePickerApi()?.getPrevTriggerProps() ?? {})} part="prev">
              Prev
            </button>
            <div {...(datePickerApi()?.getRangeTextProps() ?? {})} part="range">
              {datePickerApi()?.visibleRangeText.formatted ?? ""}
            </div>
            <button {...(datePickerApi()?.getNextTriggerProps() ?? {})} part="next">
              Next
            </button>
          </div>
          <div {...(datePickerApi()?.getTableProps() ?? {})} part="table">
            <div {...(datePickerApi()?.getTableHeadProps() ?? {})} part="table-head">
              {(datePickerApi()?.weekDays ?? []).map((weekDay) => (
                <div
                  key={weekDay.value.toString()}
                  {...(datePickerApi()?.getTableHeaderProps() ?? {})}
                  part="table-header"
                >
                  {weekDay.short}
                </div>
              ))}
            </div>
            <div {...(datePickerApi()?.getTableBodyProps() ?? {})} part="table-body">
              {datePickerDays(datePickerApi()?.weeks ?? []).map((day) => (
                <div
                  key={day.toString()}
                  {...(datePickerApi()?.getDayTableCellProps({ value: day }) ?? {})}
                  part="table-cell"
                >
                  <button
                    {...(datePickerApi()?.getDayTableCellTriggerProps({
                      value: day,
                    }) ?? {})}
                    part="cell-trigger"
                  >
                    {String(day.day)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
