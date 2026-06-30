import {
  computed,
  event,
  formControl,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import {
  createNaosZagSwitchService,
  getNaosZagSwitchApi,
  stopNaosZagSwitchService,
} from "./internal/zag/switch.js"
import type { NaosZagSwitchService } from "./internal/zag/switch.js"
import css from "./switch.wc.css?inline"

export type NaosSwitchProps = {
  checked?: boolean
  disabled?: boolean
  label?: string
  name?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosSwitch({
  checked = false,
  disabled = false,
  label = "Switch",
  name = "",
  value = "on",
}: NaosSwitchProps = {}) {
  const active = state(checked)
  const switchService = state<NaosZagSwitchService | null>(null)
  const switchApi = computed(() => getNaosZagSwitchApi(switchService()))
  const changed = event<{ checked: boolean }>("naos-change")
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
    switchService.set(createNaosZagSwitchService({
      checked: active(),
      disabled,
      host: host().element,
      id: "naos-switch",
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
    stopNaosZagSwitchService(switchService())
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
