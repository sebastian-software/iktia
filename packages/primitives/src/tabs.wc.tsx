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
  createIktiaZagTabsService,
  getIktiaZagTabsApi,
  stopIktiaZagTabsService,
  syncIktiaTabsItems,
} from "./internal/zag/tabs.js"
import type { IktiaZagTabsService } from "./internal/zag/tabs.js"
import css from "./tabs.wc.css?inline"

export type IktiaTabsProps = {
  firstLabel?: string
  orientation?: "horizontal" | "vertical"
  secondLabel?: string
  thirdLabel?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaTabs({
  firstLabel = "First",
  orientation = "horizontal",
  secondLabel = "Second",
  thirdLabel = "Third",
  value = "",
}: IktiaTabsProps = {}) {
  const selected = state(value || "first")
  const hasCustomTabs = state(false)
  const childObserver = state<MutationObserver | null>(null)
  const tabsService = state<IktiaZagTabsService | null>(null)
  const tabsApi = computed(() => getIktiaZagTabsApi(tabsService()))
  const changed = event<{ value: string }>("iktia-change")

  onConnected(() => {
    const hostElement = host().element
    const updateHasCustomTabs = () => {
      hasCustomTabs.set(Boolean(hostElement.querySelector("iktia-tab")))
    }
    const initialValue = value || firstCustomTabValue(hostElement) || "first"
    selected.set(initialValue)
    updateHasCustomTabs()
    const observer = new MutationObserver(updateHasCustomTabs)
    observer.observe(hostElement, { childList: true, subtree: true })
    childObserver.set(observer)
    tabsService.set(createIktiaZagTabsService({
      host: hostElement,
      id: "iktia-tabs",
      onValueChange(value) {
        if (value == null) return
        selected.set(value)
        changed.emit({ value })
      },
      orientation,
      root: host().root,
      value: initialValue,
    }))
  })
  onDisconnected(() => {
    childObserver()?.disconnect()
    childObserver.set(null)
    stopIktiaZagTabsService(tabsService())
    tabsService.set(null)
  })
  effect(() => {
    const api = tabsApi()
    void selected()
    if (api == null || !hasCustomTabs()) return
    return syncIktiaTabsItems({
      api,
      host: host().element,
      onRequestUpdate: () => host().update(),
      orientation,
    })
  })

  return (
    <section
      {...(tabsApi()?.getRootProps() ?? {})}
      part="root"
      data-state={selected()}
      data-orientation={orientation}
      data-mode={hasCustomTabs() ? "custom" : "legacy"}
    >
      <div
        {...(tabsApi()?.getListProps() ?? {})}
        part="tablist legacy"
        aria-orientation={orientation}
      >
        <button
          {...(tabsApi()?.getTriggerProps({ value: "first" }) ?? {})}
          part="tab"
          data-state={selected() === "first" ? "selected" : "unselected"}
        >
          {firstLabel}
        </button>
        <button
          {...(tabsApi()?.getTriggerProps({ value: "second" }) ?? {})}
          part="tab"
          data-state={selected() === "second" ? "selected" : "unselected"}
        >
          {secondLabel}
        </button>
        <button
          {...(tabsApi()?.getTriggerProps({ value: "third" }) ?? {})}
          part="tab"
          data-state={selected() === "third" ? "selected" : "unselected"}
        >
          {thirdLabel}
        </button>
      </div>
      <div
        {...(tabsApi()?.getListProps() ?? {})}
        part="tablist custom"
        aria-orientation={orientation}
      >
        <slot name="tab" />
      </div>
      <div
        {...(tabsApi()?.getContentProps({ value: "first" }) ?? {})}
        part="panel legacy"
        data-value="first"
      >
        <slot name="first" />
      </div>
      <div
        {...(tabsApi()?.getContentProps({ value: "second" }) ?? {})}
        part="panel legacy"
        data-value="second"
      >
        <slot name="second" />
      </div>
      <div
        {...(tabsApi()?.getContentProps({ value: "third" }) ?? {})}
        part="panel legacy"
        data-value="third"
      >
        <slot name="third" />
      </div>
      <div part="panels custom">
        <slot name="panel" />
      </div>
    </section>
  )
}

function firstCustomTabValue(hostElement: HTMLElement) {
  const tab = hostElement.querySelector<HTMLElement>("iktia-tab")
  return tab?.getAttribute("value") ?? ""
}
