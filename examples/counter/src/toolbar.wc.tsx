import { type ComponentOptions } from "@iktia/core"

import { Counter } from "./counter.wc.tsx"
import { Toggle } from "./toggle.wc.tsx"

export type ToolbarProps = {
  label?: string
}

export const options = {
  shadow: true,
  styles: [
    ":host { display: inline-block; font-family: system-ui, sans-serif; }",
    "[part~='root'] { display: grid; gap: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; padding: 0.875rem; background: white; }",
    "[part~='label'] { color: #334155; font-size: 0.75rem; font-weight: 700; letter-spacing: 0; text-transform: uppercase; }",
    "[part~='controls'] { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }",
    "::slotted(*) { color: #64748b; font-size: 0.875rem; }",
  ],
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
