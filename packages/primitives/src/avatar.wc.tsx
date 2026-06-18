import {
  computed,
  event,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@iktia/core"
import {
  avatarImageProps,
  createIktiaZagAvatarService,
  getIktiaZagAvatarApi,
  stopIktiaZagAvatarService,
} from "./internal/zag/avatar.js"
import type { IktiaZagAvatarService } from "./internal/zag/avatar.js"
import css from "./avatar.wc.css?inline"

export type IktiaAvatarProps = {
  alt?: string
  fallback?: string
  src?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaAvatar({
  alt = "",
  fallback = "?",
  src = "",
}: IktiaAvatarProps = {}) {
  const status = state<"error" | "loaded">("error")
  const avatarService = state<IktiaZagAvatarService | null>(null)
  const avatarApi = computed(() => getIktiaZagAvatarApi(avatarService()))
  const statusChanged = event<{ status: "error" | "loaded" }>("iktia-status-change")

  onConnected(() => {
    avatarService.set(createIktiaZagAvatarService({
      host: host().element,
      id: "iktia-avatar",
      onStatusChange(details) {
        status.set(details.status)
        statusChanged.emit(details)
      },
      root: host().root,
    }))
  })
  onDisconnected(() => {
    stopIktiaZagAvatarService(avatarService())
    avatarService.set(null)
  })

  return (
    <span
      {...(avatarApi()?.getRootProps() ?? {})}
      part="root"
      data-state={avatarApi()?.loaded ? "loaded" : status()}
    >
      <img
        {...(avatarApi()?.getImageProps() ?? {})}
        {...avatarImageProps(src, alt)}
        part="image"
      />
      <span {...(avatarApi()?.getFallbackProps() ?? {})} part="fallback">
        {fallback}
      </span>
    </span>
  )
}
