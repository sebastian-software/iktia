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
  createNaosZagRadioGroupService,
  createNaosRadioGroupContextController,
  getNaosZagRadioGroupApi,
  stopNaosZagRadioGroupService,
} from "./internal/zag/radio-group.js"
import type {
  NaosZagRadioGroupService,
  NaosRadioGroupContextController,
} from "./internal/zag/radio-group.js"
import css from "./radio-group.wc.css?inline"

export type NaosRadioGroupProps = {
  disabled?: boolean
  label?: string
  name?: string
  orientation?: "horizontal" | "vertical"
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosRadioGroup({
  disabled = false,
  label = "Options",
  name = "",
  orientation = "vertical",
  value = "",
}: NaosRadioGroupProps = {}) {
  const selected = state(value)
  const radioContext = state<NaosRadioGroupContextController | null>(null)
  const radioService = state<NaosZagRadioGroupService | null>(null)
  const radioApi = computed(() => getNaosZagRadioGroupApi(radioService()))
  const changed = event<{ value: string }>("naos-change")
  const form = formControl({
    value: () => selected() || null,
    reset: () => {
      selected.set(value)
      if (value) radioApi()?.setValue(value)
      else radioApi()?.clearValue()
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    radioService.set(createNaosZagRadioGroupService({
      disabled,
      host: host().element,
      id: "naos-radio-group",
      name,
      onValueChange(nextValue) {
        selected.set(nextValue)
        changed.emit({ value: nextValue })
      },
      orientation,
      root: host().root,
      value: selected(),
    }))
    radioContext.set(createNaosRadioGroupContextController({
      host: host().element,
      onRequestUpdate: () => host().update(),
    }))
  })
  onDisconnected(() => {
    radioContext()?.destroy()
    radioContext.set(null)
    stopNaosZagRadioGroupService(radioService())
    radioService.set(null)
  })
  effect(() => {
    const api = radioApi()
    const context = radioContext()
    if (api == null || context == null) return
    void selected()
    context.update({
      api,
      disabled,
      orientation,
    })
  })

  return (
    <section
      {...(radioApi()?.getRootProps() ?? {})}
      part="root"
      aria-disabled={disabled || undefined}
      data-state={selected() || "none"}
      data-disabled={disabled || undefined}
      data-orientation={orientation}
    >
      <span {...(radioApi()?.getLabelProps() ?? {})} part="label">
        {label}
      </span>
      <div part="items">
        <slot />
      </div>
    </section>
  )
}
