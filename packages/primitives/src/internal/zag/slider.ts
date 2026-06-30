import {
  connect,
  machine as sliderMachine,
  type Api as ZagSliderApi,
} from "@zag-js/slider"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagSliderService = ReturnType<typeof createZagService>

type NaosZagSliderServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  label: string
  max: number
  min: number
  onValueChange(value: number): void
  root: ParentNode
  step: number
  value: number
}

export function createNaosZagSliderService({
  disabled,
  host,
  id,
  label,
  max,
  min,
  onValueChange,
  root,
  step,
  value,
}: NaosZagSliderServiceOptions): NaosZagSliderService {
  return createZagService({
    machine: sliderMachine as never,
    props: {
      "aria-label": [label],
      defaultValue: [value],
      disabled,
      getAriaValueText(details: { value: number }) {
        return String(details.value)
      },
      id,
      max,
      min,
      onValueChange(details: { value: number[] }) {
        onValueChange(details.value[0] ?? min)
      },
      orientation: "horizontal",
      step,
      thumbAlignment: "contain",
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagSliderApi(
  service: NaosZagSliderService | null
): ZagSliderApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagSliderService(
  service: NaosZagSliderService | null
) {
  service?.stop()
}
