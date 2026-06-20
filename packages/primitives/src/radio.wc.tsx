import {
  effect,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@iktia/core"
import { consumeIktiaContext } from "./internal/behavior/context.js"
import {
  IKTIA_RADIO_GROUP_CONTEXT,
} from "./internal/zag/radio-group.js"
import type { IktiaRadioGroupContext } from "./internal/zag/radio-group.js"
import css from "./radio.wc.css?inline"

export type IktiaRadioProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaRadio({
  disabled = false,
  label = "",
  value = "",
}: IktiaRadioProps = {}) {
  const radioContext = state<IktiaRadioGroupContext | null>(null)
  const contextCleanup = state<VoidFunction | null>(null)

  onConnected(() => {
    contextCleanup.set(consumeIktiaContext({
      callback(context) {
        radioContext.set(context)
      },
      context: IKTIA_RADIO_GROUP_CONTEXT,
      element: host().element,
      subscribe: true,
    }))
  })
  onDisconnected(() => {
    contextCleanup()?.()
    contextCleanup.set(null)
    radioContext.set(null)
  })
  effect(() => {
    const context = radioContext()
    if (context == null) return
    return context.syncRadio({
      disabled,
      element: host().element,
      value,
    })
  })

  return (
    <span part="root">
      <span part="control" aria-hidden="true">
        <span part="indicator" />
      </span>
      <span part="label">
        <slot>{label || value}</slot>
      </span>
    </span>
  )
}
