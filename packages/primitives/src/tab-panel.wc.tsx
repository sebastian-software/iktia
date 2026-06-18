import { type ComponentOptions } from "@iktia/core"
import css from "./tab-panel.wc.css?inline"

export type IktiaTabPanelProps = {
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaTabPanel({ value = "" }: IktiaTabPanelProps = {}) {
  void value

  return (
    <div part="root">
      <slot />
    </div>
  )
}
