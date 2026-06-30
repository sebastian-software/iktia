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
  createNaosZagSegmentedControlService,
  getNaosZagSegmentedControlApi,
  stopNaosZagSegmentedControlService,
  syncNaosSegmentedItems,
} from "./internal/zag/segmented-control.js"
import type { NaosZagSegmentedControlService } from "./internal/zag/segmented-control.js"
import css from "./segmented-control.wc.css?inline"

export type NaosSegmentedControlProps = {
  disabled?: boolean
  label?: string
  name?: string
  orientation?: "horizontal" | "vertical"
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosSegmentedControl({
  disabled = false,
  label = "Options",
  name = "",
  orientation = "horizontal",
  value = "",
}: NaosSegmentedControlProps = {}) {
  const selected = state(value)
  const segmentedService = state<NaosZagSegmentedControlService | null>(null)
  const segmentedApi = computed(() =>
    getNaosZagSegmentedControlApi(segmentedService())
  )
  const changed = event<{ value: string }>("naos-change")
  const form = formControl({
    value: () => selected() || null,
    reset: () => {
      selected.set(value)
      segmentedApi()?.setValue(value ? [value] : [])
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    segmentedService.set(createNaosZagSegmentedControlService({
      disabled,
      host: host().element,
      id: "naos-segmented-control",
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
    stopNaosZagSegmentedControlService(segmentedService())
    segmentedService.set(null)
  })
  effect(() => {
    const api = segmentedApi()
    if (api == null) return
    return syncNaosSegmentedItems({
      api,
      disabled,
      host: host().element,
      onRequestUpdate: () => host().update(),
      orientation,
    })
  })

  return (
    <section
      {...(segmentedApi()?.getRootProps() ?? {})}
      part="root"
      aria-disabled={disabled || undefined}
      data-state={selected() || "none"}
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
