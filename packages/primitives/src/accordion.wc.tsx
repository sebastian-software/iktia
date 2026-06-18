import {
  computed,
  effect,
  event,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@iktia/core"
import {
  createIktiaZagAccordionService,
  getIktiaZagAccordionApi,
  parseIktiaAccordionValue,
  serializeIktiaAccordionValue,
  stopIktiaZagAccordionService,
  syncIktiaAccordionItems,
} from "./internal/zag/accordion.js"
import type { IktiaZagAccordionService } from "./internal/zag/accordion.js"
import css from "./accordion.wc.css?inline"

export type IktiaAccordionProps = {
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

export function IktiaAccordion({
  collapsible = true,
  disabled = false,
  label = "Sections",
  multiple = false,
  orientation = "vertical",
  value = "",
}: IktiaAccordionProps = {}) {
  const selected = state(parseIktiaAccordionValue(value))
  const focused = state<string | null>(null)
  const accordionService = state<IktiaZagAccordionService | null>(null)
  const accordionApi = computed(() => getIktiaZagAccordionApi(accordionService()))
  const changed = event<{ value: string[] }>("iktia-change")

  onConnected(() => {
    accordionService.set(createIktiaZagAccordionService({
      collapsible,
      disabled,
      host: host().element,
      id: "iktia-accordion",
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
    stopIktiaZagAccordionService(accordionService())
    accordionService.set(null)
  })
  effect(() => {
    const api = accordionApi()
    void selected()
    void focused()
    if (api == null) return
    return syncIktiaAccordionItems({
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
      data-state={serializeIktiaAccordionValue(selected()) || "none"}
    >
      <span part="label">{label}</span>
      <div part="items">
        <slot />
      </div>
    </section>
  )
}
