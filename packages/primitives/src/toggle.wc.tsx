import {
  computed,
  event,
  formControl,
  host,
  on,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import {
  createNaosZagToggleService,
  getNaosZagToggleApi,
  stopNaosZagToggleService,
  withoutNaosZagToggleClick,
} from "./internal/zag/toggle.js"
import type { NaosZagToggleService } from "./internal/zag/toggle.js"
import css from "./toggle.wc.css?inline"

export type NaosToggleProps = {
  disabled?: boolean
  label?: string
  name?: string
  pressed?: boolean
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosToggle({
  disabled = false,
  label = "Toggle",
  name = "",
  pressed = false,
  value = "on",
}: NaosToggleProps = {}) {
  const active = state(pressed)
  const toggleService = state<NaosZagToggleService | null>(null)
  const toggleApi = computed(() => getNaosZagToggleApi(toggleService()))
  const rootProps = computed(() =>
    withoutNaosZagToggleClick(toggleApi()?.getRootProps() ?? {})
  )
  const changed = event<{ pressed: boolean }>("naos-change")
  const form = formControl({
    value: () => (active() ? value : null),
    reset: () => {
      active.set(pressed)
      toggleApi()?.setPressed(pressed)
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    toggleService.set(createNaosZagToggleService({
      disabled,
      host: host().element,
      id: "naos-toggle",
      onPressedChange(nextPressed) {
        active.set(nextPressed)
        changed.emit({ pressed: nextPressed })
      },
      pressed: active(),
      root: host().root,
    }))
  })
  onDisconnected(() => {
    stopNaosZagToggleService(toggleService())
    toggleService.set(null)
  })

  return (
    <button
      {...rootProps()}
      part="root control"
      type="button"
      data-state={active() ? "on" : "off"}
      data-disabled={disabled || undefined}
      aria-pressed={active()}
      disabled={disabled}
      onClick={on("click", () => {
        if (disabled) return
        toggleApi()?.setPressed(!active())
      })}
    >
      <span part="label">
        <slot>{label}</slot>
      </span>
      <span {...(toggleApi()?.getIndicatorProps() ?? {})} part="indicator">
        {active() ? "On" : "Off"}
      </span>
    </button>
  )
}
