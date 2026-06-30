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
  avatarImageProps,
  createNaosZagAvatarService,
  getNaosZagAvatarApi,
  stopNaosZagAvatarService,
} from "./internal/zag/avatar.js"
import type { NaosZagAvatarService } from "./internal/zag/avatar.js"
import css from "./avatar.wc.css?inline"

export type NaosAvatarProps = {
  alt?: string
  fallback?: string
  src?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosAvatar({
  alt = "",
  fallback = "?",
  src = "",
}: NaosAvatarProps = {}) {
  const status = state<"error" | "loaded">("error")
  const avatarService = state<NaosZagAvatarService | null>(null)
  const avatarApi = computed(() => getNaosZagAvatarApi(avatarService()))
  const statusChanged = event<{ status: "error" | "loaded" }>("naos-status-change")

  onConnected(() => {
    avatarService.set(createNaosZagAvatarService({
      host: host().element,
      id: "naos-avatar",
      onStatusChange(details) {
        status.set(details.status)
        statusChanged.emit(details)
      },
      root: host().root,
    }))
  })
  onDisconnected(() => {
    stopNaosZagAvatarService(avatarService())
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
