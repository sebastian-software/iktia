import { type ComponentOptions } from "@iktia/core"

import { Counter } from "./counter.wc.tsx"
import css from "./toolbar.wc.css?inline"
import { Toggle } from "./toggle.wc.tsx"

export type ToolbarProps = {
  label?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function Toolbar({ label = "Composed controls" }: ToolbarProps = {}) {
  return (
    <section part="root" data-orientation="horizontal" aria-label={label}>
      <span part="label">{label}</span>
      <div part="controls">
        <Counter label="Nested count" />
        <Toggle label="Nested toggle" />
      </div>
      <slot />
    </section>
  )
}
