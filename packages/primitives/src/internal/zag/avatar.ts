import {
  connect,
  machine as avatarMachine,
  type Api as ZagAvatarApi,
  type StatusChangeDetails,
} from "@zag-js/avatar"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type IktiaZagAvatarService = ReturnType<typeof createZagService>

type IktiaZagAvatarServiceOptions = {
  host: HTMLElement
  id: string
  onStatusChange(details: StatusChangeDetails): void
  root: ParentNode
}

export function avatarImageProps(src: string, alt: string) {
  return { alt, src }
}

export function createIktiaZagAvatarService({
  host,
  id,
  onStatusChange,
  root,
}: IktiaZagAvatarServiceOptions): IktiaZagAvatarService {
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

export function getIktiaZagAvatarApi(
  service: IktiaZagAvatarService | null
): ZagAvatarApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopIktiaZagAvatarService(
  service: IktiaZagAvatarService | null
) {
  service?.stop()
}
