import {
  computed,
  effect,
  event,
  formControl,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import {
  collectNaosListboxItems,
  createNaosZagListboxService,
  getNaosZagListboxApi,
  listboxFormValue,
  parseNaosListboxValue,
  serializeNaosListboxValue,
  stopNaosZagListboxService,
  syncNaosListboxItems,
} from "./internal/zag/listbox.js"
import type { NaosZagListboxService } from "./internal/zag/listbox.js"
import css from "./listbox.wc.css?inline"

export type NaosListboxProps = {
  disabled?: boolean
  label?: string
  multiple?: boolean
  name?: string
  orientation?: "horizontal" | "vertical"
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosListbox({
  disabled = false,
  label = "Options",
  multiple = false,
  name = "",
  orientation = "vertical",
  value = "",
}: NaosListboxProps = {}) {
  const selected = state(parseNaosListboxValue(value))
  const highlighted = state("")
  const listboxService = state<NaosZagListboxService | null>(null)
  const listboxApi = computed(() => getNaosZagListboxApi(listboxService()))
  const changed = event<{ value: string[] }>("naos-change")
  const form = formControl({
    value: () =>
      listboxFormValue({
        multiple,
        name,
        value: selected(),
      }),
    reset: () => {
      const nextValue = parseNaosListboxValue(value)
      selected.set(nextValue)
      listboxApi()?.setValue(nextValue)
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    const hostElement = host().element
    listboxService.set(createNaosZagListboxService({
      disabled,
      host: hostElement,
      id: "naos-listbox",
      items: collectNaosListboxItems(hostElement),
      multiple,
      onHighlightChange(nextValue) {
        highlighted.set(nextValue)
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
    stopNaosZagListboxService(listboxService())
    listboxService.set(null)
  })
  effect(() => {
    const api = listboxApi()
    void selected()
    void highlighted()
    if (api == null) return
    return syncNaosListboxItems({
      api,
      disabled,
      host: host().element,
      onRequestUpdate: () => host().update(),
    })
  })

  return (
    <section
      {...(listboxApi()?.getRootProps() ?? {})}
      part="root"
      aria-disabled={disabled || undefined}
      data-state={serializeNaosListboxValue(selected()) || "none"}
      data-disabled={disabled || undefined}
      data-orientation={orientation}
    >
      <span {...(listboxApi()?.getLabelProps() ?? {})} part="label">
        {label}
      </span>
      <div
        {...(listboxApi()?.getContentProps() ?? {})}
        part="content"
        data-state={serializeNaosListboxValue(selected()) || "none"}
      >
        <slot name="item" />
      </div>
    </section>
  )
}
