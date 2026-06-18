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
} from "@iktia/core"
import {
  createIktiaZagSliderService,
  getIktiaZagSliderApi,
  stopIktiaZagSliderService,
} from "./internal/zag/slider.js"
import type { IktiaZagSliderService } from "./internal/zag/slider.js"
import css from "./slider.wc.css?inline"

export type IktiaSliderProps = {
  disabled?: boolean
  label?: string
  max?: number
  min?: number
  name?: string
  step?: number
  value?: number
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaSlider({
  disabled = false,
  label = "Slider",
  max = 100,
  min = 0,
  name = "",
  step = 1,
  value = 0,
}: IktiaSliderProps = {}) {
  const current = state(value)
  const sliderService = state<IktiaZagSliderService | null>(null)
  const sliderApi = computed(() => getIktiaZagSliderApi(sliderService()))
  const changed = event<{ value: number }>("iktia-change")
  const form = formControl({
    value: () => String(current()),
    reset: () => {
      current.set(value)
      sliderApi()?.setValue([value])
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    sliderService.set(createIktiaZagSliderService({
      disabled,
      host: host().element,
      id: "iktia-slider",
      label,
      max,
      min,
      onValueChange(nextValue) {
        current.set(nextValue)
        changed.emit({ value: nextValue })
      },
      root: host().root,
      step,
      value,
    }))
    host().element.addEventListener(
      "keydown",
      (event) => {
        const api = sliderApi()
        if (event.defaultPrevented || disabled || api == null) return

        if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault()
          api.setThumbValue(0, Math.min(max, current() + step))
          return
        }

        if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault()
          api.setThumbValue(0, Math.max(min, current() - step))
          return
        }

        if (event.key === "Home") {
          event.preventDefault()
          api.setValue([min])
          return
        }

        if (event.key === "End") {
          event.preventDefault()
          api.setValue([max])
        }
      },
      { signal: host().signal }
    )
  })
  onDisconnected(() => {
    stopIktiaZagSliderService(sliderService())
    sliderService.set(null)
  })

  return (
    <section
      {...(sliderApi()?.getRootProps() ?? {})}
      part="root"
      data-state={disabled ? "disabled" : "ready"}
      data-disabled={disabled || undefined}
      data-value={String(current())}
    >
      <div part="header">
        <label {...(sliderApi()?.getLabelProps() ?? {})} part="label">
          {label}
        </label>
        <output {...(sliderApi()?.getValueTextProps() ?? {})} part="value">
          {current()}
        </output>
      </div>
      <div {...(sliderApi()?.getControlProps() ?? {})} part="control">
        <div {...(sliderApi()?.getTrackProps() ?? {})} part="track">
          <div {...(sliderApi()?.getRangeProps() ?? {})} part="range" />
        </div>
        <div
          {...(sliderApi()?.getThumbProps({ index: 0, name }) ?? {})}
          part="thumb"
          data-value={String(current())}
          onKeyDown={on("keydown", (event) => {
            const api = sliderApi()
            if (disabled || api == null) return

            if (event.key === "ArrowRight" || event.key === "ArrowUp") {
              event.preventDefault()
              api.setThumbValue(0, Math.min(max, current() + step))
              return
            }

            if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
              event.preventDefault()
              api.setThumbValue(0, Math.max(min, current() - step))
              return
            }

            if (event.key === "Home") {
              event.preventDefault()
              api.setValue([min])
              return
            }

            if (event.key === "End") {
              event.preventDefault()
              api.setValue([max])
            }
          })}
        />
      </div>
      <input
        {...(sliderApi()?.getHiddenInputProps({ index: 0 }) ?? {})}
        name={undefined}
        value={String(current())}
      />
    </section>
  )
}
