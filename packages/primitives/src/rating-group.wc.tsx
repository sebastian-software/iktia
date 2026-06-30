import {
  computed,
  event,
  formControl,
  host,
  on,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import {
  createNaosZagRatingGroupService,
  getNaosZagRatingGroupApi,
  normalizeRatingGroupValue,
  ratingGroupFormValue,
  ratingGroupKeyboardValue,
  stopNaosZagRatingGroupService,
} from "./internal/zag/rating-group.js"
import type { NaosZagRatingGroupService } from "./internal/zag/rating-group.js"
import css from "./rating-group.wc.css?inline"

export type NaosRatingGroupProps = {
  allowHalf?: boolean
  count?: number
  disabled?: boolean
  label?: string
  name?: string
  readOnly?: boolean
  required?: boolean
  value?: number
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosRatingGroup({
  allowHalf = false,
  count = 5,
  disabled = false,
  label = "Rating",
  name = "",
  readOnly = false,
  required = false,
  value = 0,
}: NaosRatingGroupProps = {}) {
  const current = state(normalizeRatingGroupValue(value))
  const ratingGroupService = state<NaosZagRatingGroupService | null>(null)
  const ratingGroupApi = computed(() => getNaosZagRatingGroupApi(ratingGroupService()))
  const changed = event<{ value: number }>("naos-change")
  const hoverChanged = event<{ hoveredValue: number }>("naos-hover-change")
  const form = formControl({
    value: () => ratingGroupFormValue(current()),
    reset: () => {
      current.set(normalizeRatingGroupValue(value))
      if (normalizeRatingGroupValue(value) > 0) {
        ratingGroupApi()?.setValue(normalizeRatingGroupValue(value))
      } else {
        ratingGroupApi()?.clearValue()
      }
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    ratingGroupService.set(createNaosZagRatingGroupService({
      allowHalf,
      count,
      disabled,
      host: host().element,
      id: "naos-rating-group",
      label,
      name,
      onHoverChange(details) {
        hoverChanged.emit({ hoveredValue: details.hoveredValue })
      },
      onValueChange(nextValue) {
        current.set(normalizeRatingGroupValue(nextValue))
        changed.emit({ value: nextValue })
      },
      readOnly,
      required,
      root: host().root,
      value,
    }))
  })
  onDisconnected(() => {
    stopNaosZagRatingGroupService(ratingGroupService())
    ratingGroupService.set(null)
  })

  return (
    <section
      {...(ratingGroupApi()?.getRootProps() ?? {})}
      part="root"
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      data-state={current() > 0 ? "filled" : "empty"}
      data-value={current() > 0 ? String(current()) : ""}
    >
      <label {...(ratingGroupApi()?.getLabelProps() ?? {})} part="label">
        {label}
      </label>
      <div {...(ratingGroupApi()?.getControlProps() ?? {})} part="control">
        {(ratingGroupApi()?.items ?? []).map((ratingIndex) => (
          <span
            key={String(ratingIndex)}
            {...(ratingGroupApi()?.getItemProps({ index: ratingIndex }) ?? {})}
            part="item"
            data-state={current() >= ratingIndex ? "checked" : "unchecked"}
            onKeyDown={on("keydown", (event) => {
              const api = ratingGroupApi()
              if (disabled || readOnly || api == null) return

              const nextValue = ratingGroupKeyboardValue({
                allowHalf,
                count,
                current: current(),
                index: ratingIndex,
                key: event.key,
              })
              if (nextValue == null) return

              event.preventDefault()
              api.setValue(nextValue)
              queueMicrotask(() => {
                const nextItem = host().root.querySelector(
                  `[aria-posinset="${Math.ceil(nextValue)}"]`
                )
                if (nextItem instanceof HTMLElement) nextItem.focus()
              })
            })}
          >
            *
          </span>
        ))}
      </div>
      <input
        {...(ratingGroupApi()?.getHiddenInputProps() ?? {})}
        part="input"
        name={undefined}
        value={current() > 0 ? String(current()) : ""}
      />
    </section>
  )
}
