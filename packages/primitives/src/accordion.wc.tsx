import {
  computed,
  effect,
  event,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import {
  createNaosZagAccordionService,
  getNaosZagAccordionApi,
  parseNaosAccordionValue,
  serializeNaosAccordionValue,
  stopNaosZagAccordionService,
  syncNaosAccordionItems,
} from "./internal/zag/accordion.js"
import type { NaosZagAccordionService } from "./internal/zag/accordion.js"
import css from "./accordion.wc.css?inline"

export type NaosAccordionProps = {
  collapsible?: boolean
  disabled?: boolean
  label?: string
  multiple?: boolean
  orientation?: "horizontal" | "vertical"
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosAccordion({
  collapsible = true,
  disabled = false,
  label = "Sections",
  multiple = false,
  orientation = "vertical",
  value = "",
}: NaosAccordionProps = {}) {
  const selected = state(parseNaosAccordionValue(value))
  const focused = state<string | null>(null)
  const accordionService = state<NaosZagAccordionService | null>(null)
  const accordionApi = computed(() => getNaosZagAccordionApi(accordionService()))
  const changed = event<{ value: string[] }>("naos-change")

  onConnected(() => {
    accordionService.set(createNaosZagAccordionService({
      collapsible,
      disabled,
      host: host().element,
      id: "naos-accordion",
      multiple,
      onFocusChange(nextValue) {
        focused.set(nextValue)
      },
      onValueChange(nextValue) {
        selected.set(nextValue)
        changed.emit({ value: nextValue })
      },
      orientation,
      root: host().root,
      value: selected(),
    }))
  })
  onDisconnected(() => {
    stopNaosZagAccordionService(accordionService())
    accordionService.set(null)
  })
  effect(() => {
    const api = accordionApi()
    void selected()
    void focused()
    if (api == null) return
    return syncNaosAccordionItems({
      api,
      disabled,
      host: host().element,
      onRequestUpdate: () => host().update(),
    })
  })

  return (
    <section
      {...(accordionApi()?.getRootProps() ?? {})}
      part="root"
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      data-orientation={orientation}
      data-state={serializeNaosAccordionValue(selected()) || "none"}
    >
      <span part="label">{label}</span>
      <div part="items">
        <slot />
      </div>
    </section>
  )
}
