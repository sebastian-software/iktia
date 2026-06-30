import { Show, event, on, state, type ComponentOptions } from "@naos-ui/core"
import css from "./disclosure.wc.css?inline"

export type DisclosureProps = {
  label?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function Disclosure({ label = "Details" }: DisclosureProps = {}) {
  const open = state(false)
  const changed = event<boolean>("disclosure-change")

  return (
    <section part="root" data-state={open() ? "open" : "closed"}>
      <button
        part="trigger"
        aria-expanded={open()}
        aria-controls="naos-disclosure-panel"
        onClick={on("click", () => {
          open.update((value) => !value)
          changed.emit(open())
        })}
      >
        <slot name="summary" />
        {label}
      </button>
      <Show when={open()}>
        <div id="naos-disclosure-panel" part="panel">
          <slot />
        </div>
      </Show>
    </section>
  )
}
