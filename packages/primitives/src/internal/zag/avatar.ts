import {
  connect,
  machine as avatarMachine,
  type Api as ZagAvatarApi,
  type StatusChangeDetails,
} from "@zag-js/avatar"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagAvatarService = ReturnType<typeof createZagService>

type NaosZagAvatarServiceOptions = {
  host: HTMLElement
  id: string
  onStatusChange(details: StatusChangeDetails): void
  root: ParentNode
}

export function avatarImageProps(src: string, alt: string) {
  return { alt, src }
}

export function createNaosZagAvatarService({
  host,
  id,
  onStatusChange,
  root,
}: NaosZagAvatarServiceOptions): NaosZagAvatarService {
  return createZagService({
    machine: avatarMachine as never,
    props: {
      id,
      onStatusChange,
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagAvatarApi(
  service: NaosZagAvatarService | null
): ZagAvatarApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagAvatarService(
  service: NaosZagAvatarService | null
) {
  service?.stop()
}
