import {
  connect,
  createStore as createToastStore,
  group,
  machine as toastMachine,
  type Api as ZagToastApi,
  type GroupApi as ZagToastGroupApi,
  type GroupService as ZagToastGroupService,
  type Options as ZagToastOptions,
  type Placement,
  type Props as ZagToastProps,
  type Service as ZagToastService,
  type Status,
  type StatusChangeDetails,
  type Type as ZagToastType,
} from "@zag-js/toast"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagToastService = ReturnType<typeof createZagService>
export type NaosZagToastGroupService = ReturnType<typeof createZagService>

export type NaosToastView = {
  description: string
  id: string
  service: NaosZagToastService
  status: Status
  title: string
  type: ZagToastType
}

type NaosZagToastGroupServiceOptions = {
  host: HTMLElement
  id: string
  placement: Placement
  root: ParentNode
}

type NaosZagToastServiceOptions = {
  host: HTMLElement
  index: number
  onStatusChange(details: StatusChangeDetails): void
  parent: ZagToastGroupService
  root: ParentNode
  toast: Required<Pick<ZagToastProps<string>, "id" | "type">> & ZagToastProps<string>
}

type SyncNaosToastServicesOptions = {
  current: NaosToastView[]
  host: HTMLElement
  onStatusChange(id: string, details: StatusChangeDetails): void
  parent: NaosZagToastGroupService
  root: ParentNode
}

export const naosToastStore = createToastStore<string>({
  duration: 5000,
  max: 4,
  placement: "bottom-end",
  removeDelay: 0,
})

export function createNaosToast(options: ZagToastOptions<string>): string {
  return naosToastStore.create({
    closable: true,
    ...options,
  })
}

export function removeNaosToast(id: string) {
  naosToastStore.remove(id)
}

export function subscribeNaosToasts(callback: VoidFunction): VoidFunction {
  return naosToastStore.subscribe(callback)
}

export function createNaosZagToastGroupService({
  host,
  id,
  placement,
  root,
}: NaosZagToastGroupServiceOptions): NaosZagToastGroupService {
  naosToastStore.attrs.placement = placement

  return createZagService({
    machine: group.machine as never,
    props: {
      id,
      store: naosToastStore,
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagToastGroupApi(
  service: NaosZagToastGroupService | null
): ZagToastGroupApi | null {
  if (service == null) return null
  return group.connect(service as never, normalizeZagProps as never)
}

export function createNaosZagToastService({
  host,
  index,
  onStatusChange,
  parent,
  root,
  toast,
}: NaosZagToastServiceOptions): NaosZagToastService {
  return createZagService({
    machine: toastMachine as never,
    props: {
      ...toast,
      index,
      parent,
      translations: {
        closeTriggerLabel: "Dismiss notification",
      },
      onStatusChange,
    },
    scope: createZagScope({
      host,
      id: toast.id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagToastApi(
  service: NaosZagToastService | null
): ZagToastApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function syncNaosToastServices({
  current,
  host,
  onStatusChange,
  parent,
  root,
}: SyncNaosToastServicesOptions): NaosToastView[] {
  const existing = new Map(current.map((toast) => [toast.id, toast]))
  const nextToasts = naosToastStore.getVisibleToasts()

  const next = nextToasts.map((toast, index) => {
    const id = String(toast.id)
    const existingToast = existing.get(id)
    if (existingToast) {
      existing.delete(id)
      return {
        ...existingToast,
        description: String(toast.description ?? ""),
        title: String(toast.title ?? ""),
        type: toast.type ?? "info",
      }
    }

    const service = createNaosZagToastService({
      host,
      index,
      onStatusChange: (details) => onStatusChange(id, details),
      parent: parent as never,
      root,
      toast: {
        ...toast,
        id,
        type: toast.type ?? "info",
      } as Required<Pick<ZagToastProps<string>, "id" | "type">> & ZagToastProps<string>,
    })

    return {
      description: String(toast.description ?? ""),
      id,
      service,
      status: "visible" as Status,
      title: String(toast.title ?? ""),
      type: toast.type ?? "info",
    }
  })

  for (const stale of existing.values()) {
    stale.service.stop()
  }

  return next
}

export function stopNaosToastServices(toasts: NaosToastView[]) {
  for (const toast of toasts) {
    toast.service.stop()
  }
}

export function stopNaosZagToastGroupService(
  service: NaosZagToastGroupService | null
) {
  service?.stop()
}
