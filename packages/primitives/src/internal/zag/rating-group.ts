import {
  connect,
  machine as ratingGroupMachine,
  type Api as ZagRatingGroupApi,
  type HoverChangeDetails,
  type ValueChangeDetails,
} from "@zag-js/rating-group"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagRatingGroupService = ReturnType<typeof createZagService>

type NaosZagRatingGroupServiceOptions = {
  allowHalf: boolean
  count: number
  disabled: boolean
  host: HTMLElement
  id: string
  label: string
  name: string
  onHoverChange(details: HoverChangeDetails): void
  onValueChange(value: number): void
  readOnly: boolean
  required: boolean
  root: ParentNode
  value: number
}

export function normalizeRatingGroupValue(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : -1
}

export function ratingGroupFormValue(value: number): FormDataEntryValue | null {
  return value > 0 ? String(value) : null
}

export function ratingGroupKeyboardValue({
  allowHalf,
  count,
  current,
  index,
  key,
}: {
  allowHalf: boolean
  count: number
  current: number
  index: number
  key: string
}): number | null {
  const step = allowHalf ? 0.5 : 1

  if (key === "ArrowLeft" || key === "ArrowDown") {
    return Math.max(1, current - step)
  }

  if (key === "ArrowRight" || key === "ArrowUp") {
    return Math.min(count, current + step)
  }

  if (key === "Home") return 1
  if (key === "End") return count
  if (key === " " || key === "Spacebar" || key === "Space") return index

  return null
}

export function createNaosZagRatingGroupService({
  allowHalf,
  count,
  disabled,
  host,
  id,
  label,
  name,
  onHoverChange,
  onValueChange,
  readOnly,
  required,
  root,
  value,
}: NaosZagRatingGroupServiceOptions): NaosZagRatingGroupService {
  return createZagService({
    machine: ratingGroupMachine as never,
    props: {
      allowHalf,
      count,
      defaultValue: normalizeRatingGroupValue(value),
      disabled,
      id,
      name,
      onHoverChange,
      onValueChange(details: ValueChangeDetails) {
        onValueChange(details.value)
      },
      readOnly,
      required,
      translations: {
        ratingValueText(value: number) {
          return `${value} of ${count}`
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

export function getNaosZagRatingGroupApi(
  service: NaosZagRatingGroupService | null
): ZagRatingGroupApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagRatingGroupService(
  service: NaosZagRatingGroupService | null
) {
  service?.stop()
}
