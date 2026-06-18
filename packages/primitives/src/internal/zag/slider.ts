import {
  connect,
  machine as sliderMachine,
  type Api as ZagSliderApi,
} from "@zag-js/slider"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type IktiaZagSliderService = ReturnType<typeof createZagService>

type IktiaZagSliderServiceOptions = {
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

export function createIktiaZagSliderService({
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
}: IktiaZagSliderServiceOptions): IktiaZagSliderService {
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

export function getIktiaZagSliderApi(
  service: IktiaZagSliderService | null
): ZagSliderApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopIktiaZagSliderService(
  service: IktiaZagSliderService | null
) {
  service?.stop()
}
