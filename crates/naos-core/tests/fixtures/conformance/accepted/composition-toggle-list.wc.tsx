import { Show, computed, effect, event, host, on, state } from "@naos-ui/core"

export function CompositionToggleList({
  visible = true,
}: CompositionToggleListProps = {}) {
  const pressed = state(false)
  const items = computed(() => (pressed() ? ["On"] : ["Off"]))
  const toggled = event<boolean>("toggle-change")

  effect(() => {
    const { element, signal } = host()
    element.dataset.effect = signal.aborted ? "off" : "on"
    return () => {
      delete element.dataset.effect
    }
  })

  return (
    <button
      part="root control"
      data-state={pressed() ? "on" : "off"}
      aria-pressed={pressed()}
      onClick={on("click", () => {
        pressed.update((value) => !value)
        toggled.emit(pressed())
      })}
    >
      <Show when={visible} fallback={<span part="label">Hidden</span>}>
        <span part="label">Visible</span>
      </Show>
      {items().map((item, index) => (
        <span key={item} part="indicator" data-index={index}>
          {item}
        </span>
      ))}
    </button>
  )
}
