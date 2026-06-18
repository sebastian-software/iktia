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
  createIktiaZagToggleGroupService,
  getIktiaZagToggleGroupApi,
  parseIktiaToggleGroupValue,
  serializeIktiaToggleGroupValue,
  stopIktiaZagToggleGroupService,
  syncIktiaToggleGroupItems,
  toggleGroupFormValue,
} from "./internal/zag/toggle-group.js"
import type { IktiaZagToggleGroupService } from "./internal/zag/toggle-group.js"
import css from "./toggle-group.wc.css?inline"

export type IktiaToggleGroupProps = {
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

export function IktiaToggleGroup({
  disabled = false,
  label = "Options",
  multiple = false,
  name = "",
  orientation = "horizontal",
  value = "",
}: IktiaToggleGroupProps = {}) {
  const selected = state(parseIktiaToggleGroupValue(value))
  const toggleGroupService = state<IktiaZagToggleGroupService | null>(null)
  const toggleGroupApi = computed(() => getIktiaZagToggleGroupApi(toggleGroupService()))
  const changed = event<{ value: string[] }>("iktia-change")
  const form = formControl({
    value: () =>
      toggleGroupFormValue({
        multiple,
        name,
        value: selected(),
      }),
    reset: () => {
      const nextValue = parseIktiaToggleGroupValue(value)
      selected.set(nextValue)
      toggleGroupApi()?.setValue(nextValue)
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    toggleGroupService.set(createIktiaZagToggleGroupService({
      disabled,
      host: host().element,
      id: "iktia-toggle-group",
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
    stopIktiaZagToggleGroupService(toggleGroupService())
    toggleGroupService.set(null)
  })
  effect(() => {
    const api = toggleGroupApi()
    if (api == null) return
    return syncIktiaToggleGroupItems({
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
      data-state={serializeIktiaToggleGroupValue(selected()) || "none"}
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
