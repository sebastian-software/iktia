import {
  computed,
  event,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import {
  getNaosZagToastApi,
  getNaosZagToastGroupApi,
  removeNaosToast,
  createNaosZagToastGroupService,
  stopNaosToastServices,
  stopNaosZagToastGroupService,
  subscribeNaosToasts,
  syncNaosToastServices,
} from "./internal/zag/toast.js"
import type {
  NaosToastView,
  NaosZagToastGroupService,
} from "./internal/zag/toast.js"
import css from "./toast-root.wc.css?inline"

export type NaosToastRootProps = {
  label?: string
  placement?: "top-start" | "top" | "top-end" | "bottom-start" | "bottom" | "bottom-end"
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosToastRoot({
  label = "Notifications",
  placement = "bottom-end",
}: NaosToastRootProps = {}) {
  const groupService = state<NaosZagToastGroupService | null>(null)
  const groupApi = computed(() => getNaosZagToastGroupApi(groupService()))
  const toasts = state<NaosToastView[]>([])
  const unsubscribe = state<VoidFunction | null>(null)
  const statusChanged = event<{ id: string; status: string }>("naos-status-change")

  onConnected(() => {
    const service = createNaosZagToastGroupService({
      host: host().element,
      id: "naos-toast-root",
      placement,
      root: host().root,
    })
    groupService.set(service)
    toasts.set(syncNaosToastServices({
      current: toasts(),
      host: host().element,
      onStatusChange(id, details) {
        statusChanged.emit({ id, status: details.status })
        if (details.status === "unmounted") {
          removeNaosToast(id)
        }
        host().update()
      },
      parent: service,
      root: host().root,
    }))
    unsubscribe.set(subscribeNaosToasts(() => {
      queueMicrotask(() => {
        toasts.set(syncNaosToastServices({
          current: toasts(),
          host: host().element,
          onStatusChange(id, details) {
            statusChanged.emit({ id, status: details.status })
            if (details.status === "unmounted") {
              removeNaosToast(id)
            }
            host().update()
          },
          parent: service,
          root: host().root,
        }))
      })
    }))
  })
  onDisconnected(() => {
    unsubscribe()?.()
    unsubscribe.set(null)
    stopNaosToastServices(toasts())
    toasts.set([])
    stopNaosZagToastGroupService(groupService())
    groupService.set(null)
  })

  return (
    <section
      {...(groupApi()?.getGroupProps({ label }) ?? {})}
      part="root"
      data-count={String(toasts().length)}
      data-placement={placement}
    >
      {toasts().map((toast) => (
        <article
          key={toast.id}
          {...(getNaosZagToastApi(toast.service)?.getRootProps() ?? {})}
          part="toast"
          data-type={toast.type}
          data-state={toast.status}
        >
          <div
            {...(getNaosZagToastApi(toast.service)?.getTitleProps() ?? {})}
            part="title"
          >
            {toast.title}
          </div>
          <div
            {...(getNaosZagToastApi(toast.service)?.getDescriptionProps() ?? {})}
            part="description"
          >
            {toast.description}
          </div>
          <button
            {...(getNaosZagToastApi(toast.service)?.getCloseTriggerProps() ?? {})}
            part="close"
          >
            Dismiss
          </button>
        </article>
      ))}
    </section>
  )
}
