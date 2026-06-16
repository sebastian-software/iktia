import {
  Show,
  computed,
  effect,
  event,
  host,
  on,
  state,
  type ComponentOptions,
} from "@iktia/core"
import css from "./toggle.wc.css?inline"

export type ToggleProps = {
  disabled?: boolean
  label?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function Toggle({ disabled = false, label = "Toggle" }: ToggleProps = {}) {
  const pressed = state(false)
  const stateLabel = computed(() => (pressed() ? "On" : "Off"))
  const indicators = computed(() => (pressed() ? ["Pressed", "Active"] : ["Idle"]))
  const changed = event<boolean>("toggle-change")

  effect(() => {
    const { element, signal } = host()
    element.setAttribute("data-effect", "mounted")
    signal.addEventListener(
      "abort",
      () => {
        element.setAttribute("data-effect", "aborted")
      },
      { once: true }
    )

    return () => {
      element.removeAttribute("data-effect")
    }
  })

  return (
    <button
      part="root control"
      data-state={pressed() ? "on" : "off"}
      data-disabled={disabled || undefined}
      aria-pressed={pressed()}
      disabled={disabled}
      onClick={on("click", () => {
        if (disabled) return
        pressed.update((value) => !value)
        changed.emit(pressed())
      })}
    >
      <span part="label">{label}</span>
      <Show when={pressed()} fallback={<span part="indicator">Off</span>}>
        <span part="indicator">{stateLabel()}</span>
      </Show>
      {indicators().map((item, index) => (
        <span key={item} part="indicator" data-index={index}>
          {item}
        </span>
      ))}
      <slot />
    </button>
  )
}
