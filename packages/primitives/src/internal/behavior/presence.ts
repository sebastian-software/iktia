import {
  springMotionTokenClassName,
  waitForAnimations,
} from "@naos-ui/motion"

export type NaosPresencePhase =
  | "closed"
  | "closing"
  | "entering"
  | "open"
  | "unmounted"

export type NaosPresenceSnapshot = {
  phase: NaosPresencePhase
}

export type NaosPresenceMotionAttributes = {
  class: string
}

export const NAOS_PRESENCE_MOTION_CLASS = springMotionTokenClassName({
  kind: "presence",
  preset: "snappy",
})

const NAOS_PRESENCE_MOTION_ATTRIBUTES = {
  class: NAOS_PRESENCE_MOTION_CLASS,
}

export function createNaosPresenceSnapshot(open: boolean): NaosPresenceSnapshot {
  return { phase: open ? "open" : "closed" }
}

export function nextNaosPresenceSnapshot(
  current: NaosPresenceSnapshot,
  open: boolean
): NaosPresenceSnapshot {
  if (open) {
    if (current.phase === "entering" || current.phase === "open") return current
    return { phase: "entering" }
  }
  if (current.phase === "closed" || current.phase === "closing") return current
  if (current.phase === "unmounted") return { phase: "closed" }
  return { phase: "closing" }
}

export function settleNaosPresenceSnapshot(
  current: NaosPresenceSnapshot,
  open: boolean
): NaosPresenceSnapshot {
  if (open && current.phase === "entering") return { phase: "open" }
  if (!open && current.phase === "closing") return { phase: "closed" }
  return current
}

export function isNaosPresenceOpen({ phase }: NaosPresenceSnapshot) {
  return phase === "entering" || phase === "open"
}

export function isNaosPresenceHidden({ phase }: NaosPresenceSnapshot) {
  return phase === "closed" || phase === "unmounted"
}

export function getNaosPresenceAttributes({
  phase,
}: NaosPresenceSnapshot): Record<string, string | undefined> {
  return {
    "data-ending-style": phase === "closing" ? "" : undefined,
    "data-naos-presence": phase,
    "data-starting-style": phase === "entering" ? "" : undefined,
  }
}

export function getNaosPresenceMotionAttributes(): NaosPresenceMotionAttributes {
  return NAOS_PRESENCE_MOTION_ATTRIBUTES
}

export function scheduleNaosPresenceFrame(callback: () => void) {
  if (typeof globalThis.requestAnimationFrame === "function") {
    const frame = globalThis.requestAnimationFrame(callback)
    return () => globalThis.cancelAnimationFrame?.(frame)
  }
  const timeout = globalThis.setTimeout(callback, 0)
  return () => globalThis.clearTimeout(timeout)
}

export function waitForNaosPresenceExit(
  element: Element | null | undefined,
  callback: () => void
) {
  let cancelled = false
  const abort = new AbortController()
  const finish = () => {
    if (!cancelled) callback()
  }

  const cancelFrame = scheduleNaosPresenceFrame(() => {
    if (cancelled) return
    void waitForAnimations(element, {
      reducedMotion: "media",
      signal: abort.signal,
      subtree: true,
    })
      .then(finish)
  })

  return () => {
    cancelled = true
    abort.abort()
    cancelFrame()
  }
}
