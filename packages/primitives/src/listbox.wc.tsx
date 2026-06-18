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
} from "@iktia/core"
import {
  collectIktiaListboxItems,
  createIktiaZagListboxService,
  getIktiaZagListboxApi,
  listboxFormValue,
  parseIktiaListboxValue,
  serializeIktiaListboxValue,
  stopIktiaZagListboxService,
  syncIktiaListboxItems,
} from "./internal/zag/listbox.js"
import type { IktiaZagListboxService } from "./internal/zag/listbox.js"
import css from "./listbox.wc.css?inline"

export type IktiaListboxProps = {
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

export function IktiaListbox({
  disabled = false,
  label = "Options",
  multiple = false,
  name = "",
  orientation = "vertical",
  value = "",
}: IktiaListboxProps = {}) {
  const selected = state(parseIktiaListboxValue(value))
  const highlighted = state("")
  const listboxService = state<IktiaZagListboxService | null>(null)
  const listboxApi = computed(() => getIktiaZagListboxApi(listboxService()))
  const changed = event<{ value: string[] }>("iktia-change")
  const form = formControl({
    value: () =>
      listboxFormValue({
        multiple,
        name,
        value: selected(),
      }),
    reset: () => {
      const nextValue = parseIktiaListboxValue(value)
      selected.set(nextValue)
      listboxApi()?.setValue(nextValue)
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    const hostElement = host().element
    listboxService.set(createIktiaZagListboxService({
      disabled,
      host: hostElement,
      id: "iktia-listbox",
      items: collectIktiaListboxItems(hostElement),
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
    stopIktiaZagListboxService(listboxService())
    listboxService.set(null)
  })
  effect(() => {
    const api = listboxApi()
    void selected()
    void highlighted()
    if (api == null) return
    return syncIktiaListboxItems({
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
      data-state={serializeIktiaListboxValue(selected()) || "none"}
      data-disabled={disabled || undefined}
      data-orientation={orientation}
    >
      <span {...(listboxApi()?.getLabelProps() ?? {})} part="label">
        {label}
      </span>
      <div
        {...(listboxApi()?.getContentProps() ?? {})}
        part="content"
        data-state={serializeIktiaListboxValue(selected()) || "none"}
      >
        <slot name="item" />
      </div>
    </section>
  )
}
