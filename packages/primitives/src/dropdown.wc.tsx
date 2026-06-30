import { effect, event, host, on, state, type ComponentOptions } from "@naos-ui/core"
import {
  nextDisclosureOpen,
  shouldCloseDisclosureForKey,
  shouldIgnoreOutsidePointer,
} from "./internal/behavior/disclosure.js"
import css from "./dropdown.wc.css?inline"

export type NaosDropdownProps = {
  label?: string
  open?: boolean
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosDropdown({
  label = "Options",
  open = false,
}: NaosDropdownProps = {}) {
  const expanded = state(open)
  const changed = event<{ open: boolean }>("naos-open-change")

  effect(() => {
    const { element, signal } = host()
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (!expanded()) return
        if (shouldIgnoreOutsidePointer(element, event.target)) return
        expanded.set(false)
        changed.emit({ open: expanded() })
        const focusTrigger = () => {
          const trigger = element.shadowRoot?.querySelector("[part~='trigger']")
          if (trigger instanceof HTMLElement) trigger.focus()
        }
        focusTrigger()
        setTimeout(focusTrigger, 0)
      },
      { signal }
    )
  })

  return (
    <div part="root" data-state={expanded() ? "open" : "closed"}>
      <button
        part="trigger"
        type="button"
        aria-expanded={expanded()}
        aria-controls="naos-dropdown-panel"
        onKeyDown={on("keydown", (event) => {
          if (!shouldCloseDisclosureForKey(event.key)) return
          if (!expanded()) return
          event.preventDefault()
          expanded.set(false)
          changed.emit({ open: expanded() })
        })}
        onClick={on("click", () => {
          expanded.set(nextDisclosureOpen(expanded()))
          changed.emit({ open: expanded() })
        })}
      >
        <slot name="trigger">{label}</slot>
      </button>
      <div id="naos-dropdown-panel" part="panel">
        <slot />
      </div>
    </div>
  )
}
