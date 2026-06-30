import { CalendarDate } from "@internationalized/date"
import {
  connect,
  machine as datePickerMachine,
  type Api as ZagDatePickerApi,
  type DateValue,
  type DayTableCellState,
  type FocusChangeDetails,
  type OpenChangeDetails,
  type ValueChangeDetails,
} from "@zag-js/date-picker"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagDatePickerService = ReturnType<typeof createZagService>

type NaosZagDatePickerServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  label: string
  locale: string
  name: string
  onFocusChange(details: FocusChangeDetails): void
  onOpenChange(details: OpenChangeDetails): void
  onValueChange(details: ValueChangeDetails): void
  placeholder: string
  readOnly: boolean
  required: boolean
  root: ParentNode
  value: string
}

export function datePickerValueArray(value: string): DateValue[] {
  if (!value) return []
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match == null) return []
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return []
  }
  try {
    return [new CalendarDate(year, month, day)]
  } catch {
    return []
  }
}

export function datePickerValueString(values: DateValue[]): string {
  return values[0]?.toString() ?? ""
}

export function datePickerFormValue(value: string): FormDataEntryValue | null {
  return value ? value : null
}

export function datePickerDays(weeks: DateValue[][]): DateValue[] {
  return weeks.flat()
}

export function createNaosZagDatePickerService({
  disabled,
  host,
  id,
  label,
  locale,
  name,
  onFocusChange,
  onOpenChange,
  onValueChange,
  placeholder,
  readOnly,
  required,
  root,
  value,
}: NaosZagDatePickerServiceOptions): NaosZagDatePickerService {
  const defaultValue = datePickerValueArray(value)

  return createZagService({
    machine: datePickerMachine as never,
    props: {
      closeOnSelect: true,
      defaultFocusedValue: defaultValue[0],
      defaultValue,
      disabled,
      fixedWeeks: true,
      id,
      ids: {
        label: () => `${id}:label`,
      },
      locale,
      name,
      onFocusChange,
      onOpenChange,
      onValueChange,
      openOnClick: true,
      placeholder,
      positioning: {
        placement: "bottom-start",
      },
      readOnly,
      required,
      selectionMode: "single",
      translations: {
        clearTrigger: "Clear date",
        content: `${label} calendar`,
        dayCell(state: DayTableCellState) {
          return state.valueText
        },
        monthSelect: "Month",
        nextTrigger: () => "Next month",
        placeholder: () => ({
          day: "dd",
          month: "mm",
          year: "yyyy",
        }),
        presetTrigger(valueAsString: string[]) {
          return valueAsString.join(", ")
        },
        prevTrigger: () => "Previous month",
        trigger(open: boolean) {
          return open ? "Close calendar" : "Open calendar"
        },
        viewTrigger: () => "Change calendar view",
        yearSelect: "Year",
      },
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagDatePickerApi(
  service: NaosZagDatePickerService | null
): ZagDatePickerApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagDatePickerService(
  service: NaosZagDatePickerService | null
) {
  service?.stop()
}
