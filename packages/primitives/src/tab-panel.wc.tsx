import { type ComponentOptions } from "@naos-ui/core"
import css from "./tab-panel.wc.css?inline"

export type NaosTabPanelProps = {
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosTabPanel({ value = "" }: NaosTabPanelProps = {}) {
  void value

  return (
    <div part="root">
      <slot />
    </div>
  )
}
