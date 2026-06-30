import {
  connect,
  machine as progressMachine,
  type Api as ZagProgressApi,
  type Orientation,
  type ValueChangeDetails,
  type ValueTranslationDetails,
} from "@zag-js/progress"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagProgressService = ReturnType<typeof createZagService>

type NaosZagProgressServiceOptions = {
  host: HTMLElement
  id: string
  label: string
  locale: string
  max: number
  min: number
  onValueChange(details: ValueChangeDetails): void
  orientation: Orientation
  root: ParentNode
  value: number | null
}

export function progressValue(
  indeterminate: boolean,
  value: number,
  min: number,
  max: number
): number | null {
  if (indeterminate) return null
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(value, min), max)
}

export function createNaosZagProgressService({
  host,
  id,
  label,
  locale,
  max,
  min,
  onValueChange,
  orientation,
  root,
  value,
}: NaosZagProgressServiceOptions): NaosZagProgressService {
  return createZagService({
    machine: progressMachine as never,
    props: {
      defaultValue: value,
      formatOptions: {
        style: "percent",
      },
      id,
      locale,
      max,
      min,
      onValueChange,
      orientation,
      translations: {
        value(details: ValueTranslationDetails) {
          if (details.value == null) return `${label}: in progress`
          return `${label}: ${details.formatter.format(details.percent / 100)}`
        },
      },
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagProgressApi(
  service: NaosZagProgressService | null
): ZagProgressApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagProgressService(
  service: NaosZagProgressService | null
) {
  service?.stop()
}
