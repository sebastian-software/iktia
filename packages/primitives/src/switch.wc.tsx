import {
  computed,
  event,
  formControl,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@iktia/core"
import {
  createIktiaZagSwitchService,
  getIktiaZagSwitchApi,
  stopIktiaZagSwitchService,
} from "./internal/zag/switch.js"
import type { IktiaZagSwitchService } from "./internal/zag/switch.js"
import css from "./switch.wc.css?inline"

export type IktiaSwitchProps = {
  checked?: boolean
  disabled?: boolean
  label?: string
  name?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaSwitch({
  checked = false,
  disabled = false,
  label = "Switch",
  name = "",
  value = "on",
}: IktiaSwitchProps = {}) {
  const active = state(checked)
  const switchService = state<IktiaZagSwitchService | null>(null)
  const switchApi = computed(() => getIktiaZagSwitchApi(switchService()))
  const changed = event<{ checked: boolean }>("iktia-change")
  const form = formControl({
    value: () => (active() ? value : null),
    reset: () => {
      active.set(checked)
      switchApi()?.setChecked(checked)
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    switchService.set(createIktiaZagSwitchService({
      checked: active(),
      disabled,
      host: host().element,
      id: "iktia-switch",
      label,
      onCheckedChange(nextChecked) {
        active.set(nextChecked)
        changed.emit({ checked: nextChecked })
      },
      root: host().root,
      value,
    }))
  })
  onDisconnected(() => {
    stopIktiaZagSwitchService(switchService())
    switchService.set(null)
  })

  return (
    <label
      {...(switchApi()?.getRootProps() ?? {})}
      part="root control"
      data-state={active() ? "checked" : "unchecked"}
      data-disabled={disabled || undefined}
    >
      <input
        {...(switchApi()?.getHiddenInputProps() ?? {})}
        disabled={disabled}
        name={undefined}
        value={value}
      />
      <span
        {...(switchApi()?.getControlProps() ?? {})}
        part="track"
        role="switch"
        aria-checked={active() ? "true" : "false"}
        data-state={active() ? "checked" : "unchecked"}
      >
        <span
          {...(switchApi()?.getThumbProps() ?? {})}
          part="thumb"
          data-state={active() ? "checked" : "unchecked"}
        />
      </span>
      <span {...(switchApi()?.getLabelProps() ?? {})} part="label">
        <slot>{label}</slot>
      </span>
    </label>
  )
}
