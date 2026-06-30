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
  createNaosZagToggleGroupService,
  getNaosZagToggleGroupApi,
  parseNaosToggleGroupValue,
  serializeNaosToggleGroupValue,
  stopNaosZagToggleGroupService,
  syncNaosToggleGroupItems,
  toggleGroupFormValue,
} from "./internal/zag/toggle-group.js"
import type { NaosZagToggleGroupService } from "./internal/zag/toggle-group.js"
import css from "./toggle-group.wc.css?inline"

export type NaosToggleGroupProps = {
  disabled?: boolean
  label?: string
  multiple?: boolean
  name?: string
  orientation?: "horizontal" | "vertical"
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosToggleGroup({
  disabled = false,
  label = "Options",
  multiple = false,
  name = "",
  orientation = "horizontal",
  value = "",
}: NaosToggleGroupProps = {}) {
  const selected = state(parseNaosToggleGroupValue(value))
  const toggleGroupService = state<NaosZagToggleGroupService | null>(null)
  const toggleGroupApi = computed(() => getNaosZagToggleGroupApi(toggleGroupService()))
  const changed = event<{ value: string[] }>("naos-change")
  const form = formControl({
    value: () =>
      toggleGroupFormValue({
        multiple,
        name,
        value: selected(),
      }),
    reset: () => {
      const nextValue = parseNaosToggleGroupValue(value)
      selected.set(nextValue)
      toggleGroupApi()?.setValue(nextValue)
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    toggleGroupService.set(createNaosZagToggleGroupService({
      disabled,
      host: host().element,
      id: "naos-toggle-group",
      multiple,
      onValueChange(nextValue) {
        selected.set(nextValue)
        changed.emit({ value: nextValue })
      },
      orientation,
      root: host().root,
      value: selected(),
    }))
  })
  onDisconnected(() => {
    stopNaosZagToggleGroupService(toggleGroupService())
    toggleGroupService.set(null)
  })
  effect(() => {
    const api = toggleGroupApi()
    if (api == null) return
    return syncNaosToggleGroupItems({
      api,
      disabled,
      host: host().element,
      multiple,
      onRequestUpdate: () => host().update(),
      orientation,
    })
  })

  return (
    <section
      {...(toggleGroupApi()?.getRootProps() ?? {})}
      part="root"
      aria-disabled={disabled || undefined}
      data-state={serializeNaosToggleGroupValue(selected()) || "none"}
      data-disabled={disabled || undefined}
      data-orientation={orientation}
    >
      <span part="label">{label}</span>
      <div part="items">
        <slot />
      </div>
    </section>
  )
}
