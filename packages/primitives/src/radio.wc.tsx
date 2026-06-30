import {
  effect,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import { consumeNaosContext } from "./internal/behavior/context.js"
import {
  NAOS_RADIO_GROUP_CONTEXT,
} from "./internal/zag/radio-group.js"
import type { NaosRadioGroupContext } from "./internal/zag/radio-group.js"
import css from "./radio.wc.css?inline"

export type NaosRadioProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosRadio({
  disabled = false,
  label = "",
  value = "",
}: NaosRadioProps = {}) {
  const radioContext = state<NaosRadioGroupContext | null>(null)
  const contextCleanup = state<VoidFunction | null>(null)

  onConnected(() => {
    contextCleanup.set(consumeNaosContext({
      callback(context) {
        radioContext.set(context)
      },
      context: NAOS_RADIO_GROUP_CONTEXT,
      element: host().element,
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
