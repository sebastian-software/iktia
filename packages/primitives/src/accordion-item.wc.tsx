import { type ComponentOptions } from "@iktia/core"
import css from "./accordion-item.wc.css?inline"

export type IktiaAccordionItemProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaAccordionItem({
  disabled = false,
  label = "",
  value = "",
}: IktiaAccordionItemProps = {}) {
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
