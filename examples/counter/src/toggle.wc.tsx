import {
  For,
  Show,
  computed,
  effect,
  event,
  host,
  on,
  signal,
  type ComponentOptions,
} from "@iktia/core"

export type ToggleProps = {
  disabled?: boolean
  label?: string
}

export const options = {
  shadow: true,
  styles: [
    ":host { display: inline-block; font-family: system-ui, sans-serif; }",
    "button { display: inline-flex; align-items: center; gap: 0.5rem; border: 1px solid #888; border-radius: 0.375rem; padding: 0.5rem 0.75rem; background: white; color: #111; }",
    "button[data-state='on'] { border-color: #0f766e; background: #ecfdf5; }",
    "[part~='indicator'] { font-size: 0.75rem; color: #475569; }",
  ],
} satisfies ComponentOptions

export function Toggle({ disabled = false, label = "Toggle" }: ToggleProps = {}) {
  const pressed = signal(false)
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
      <For each={indicators()}>
        {(item, index) => (
          <span part="indicator" data-index={index}>
            {item}
          </span>
        )}
      </For>
      <slot />
    </button>
  )
}
