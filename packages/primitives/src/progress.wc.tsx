import {
  computed,
  event,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import {
  createNaosZagProgressService,
  getNaosZagProgressApi,
  progressValue,
  stopNaosZagProgressService,
} from "./internal/zag/progress.js"
import type { NaosZagProgressService } from "./internal/zag/progress.js"
import css from "./progress.wc.css?inline"

export type NaosProgressProps = {
  indeterminate?: boolean
  label?: string
  locale?: string
  max?: number
  min?: number
  orientation?: "horizontal" | "vertical"
  value?: number
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosProgress({
  indeterminate = false,
  label = "Progress",
  locale = "en-US",
  max = 100,
  min = 0,
  orientation = "horizontal",
  value = 0,
}: NaosProgressProps = {}) {
  const current = state(progressValue(indeterminate, value, min, max))
  const progressService = state<NaosZagProgressService | null>(null)
  const progressApi = computed(() => getNaosZagProgressApi(progressService()))
  const changed = event<{ value: number | null }>("naos-change")

  onConnected(() => {
    progressService.set(createNaosZagProgressService({
      host: host().element,
      id: "naos-progress",
      label,
      locale,
      max,
      min,
      onValueChange(details) {
        current.set(details.value)
        changed.emit(details)
      },
      orientation,
      root: host().root,
      value: current(),
    }))
  })
  onDisconnected(() => {
    stopNaosZagProgressService(progressService())
    progressService.set(null)
  })

  return (
    <section
      {...(progressApi()?.getRootProps() ?? {})}
      part="root"
      data-state={progressApi()?.indeterminate ? "indeterminate" : "loading"}
      data-value={current() == null ? undefined : String(current())}
      data-orientation={orientation}
    >
      <div {...(progressApi()?.getLabelProps() ?? {})} part="label">
        {label}
      </div>
      <div {...(progressApi()?.getTrackProps() ?? {})} part="track">
        <div {...(progressApi()?.getRangeProps() ?? {})} part="range" />
      </div>
      <div {...(progressApi()?.getValueTextProps() ?? {})} part="value">
        {progressApi()?.valueAsString ?? ""}
      </div>
    </section>
  )
}
