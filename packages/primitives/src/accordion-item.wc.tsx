import { type ComponentOptions } from "@naos-ui/core"
import css from "./accordion-item.wc.css?inline"

export type NaosAccordionItemProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosAccordionItem({
  disabled = false,
  label = "",
  value = "",
}: NaosAccordionItemProps = {}) {
  void disabled
  void value

  return (
    <div part="root">
      <button part="trigger" type="button">
        <span part="indicator" aria-hidden="true">+</span>
        <span part="label">
          <slot name="trigger">{label || value}</slot>
        </span>
      </button>
      <div part="content">
        <slot />
      </div>
    </div>
  )
}
