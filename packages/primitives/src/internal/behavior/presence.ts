import { waitForAnimations } from "@iktia/motion"

export type IktiaPresencePhase =
  | "closed"
  | "closing"
  | "entering"
  | "open"
  | "unmounted"

export type IktiaPresenceSnapshot = {
  phase: IktiaPresencePhase
}

export function createIktiaPresenceSnapshot(open: boolean): IktiaPresenceSnapshot {
  return { phase: open ? "open" : "closed" }
}

export function nextIktiaPresenceSnapshot(
  current: IktiaPresenceSnapshot,
  open: boolean
): IktiaPresenceSnapshot {
  if (open) {
    if (current.phase === "entering" || current.phase === "open") return current
    return { phase: "entering" }
  }
  if (current.phase === "closed" || current.phase === "closing") return current
  if (current.phase === "unmounted") return { phase: "closed" }
  return { phase: "closing" }
}

export function settleIktiaPresenceSnapshot(
  current: IktiaPresenceSnapshot,
  open: boolean
): IktiaPresenceSnapshot {
  if (open && current.phase === "entering") return { phase: "open" }
  if (!open && current.phase === "closing") return { phase: "closed" }
  return current
}

export function isIktiaPresenceOpen({ phase }: IktiaPresenceSnapshot) {
  return phase === "entering" || phase === "open"
}

export function isIktiaPresenceHidden({ phase }: IktiaPresenceSnapshot) {
  return phase === "closed" || phase === "unmounted"
}

export function getIktiaPresenceAttributes({
  phase,
}: IktiaPresenceSnapshot): Record<string, string | undefined> {
  return {
    "data-ending-style": phase === "closing" ? "" : undefined,
    "data-iktia-presence": phase,
    "data-starting-style": phase === "entering" ? "" : undefined,
  }
}

export function scheduleIktiaPresenceFrame(callback: () => void) {
  if (typeof globalThis.requestAnimationFrame === "function") {
    const frame = globalThis.requestAnimationFrame(callback)
    return () => globalThis.cancelAnimationFrame?.(frame)
  }
  const timeout = globalThis.setTimeout(callback, 0)
  return () => globalThis.clearTimeout(timeout)
}

export function waitForIktiaPresenceExit(
  element: Element | null | undefined,
  callback: () => void
) {
  let cancelled = false
  const abort = new AbortController()
  const finish = () => {
    if (!cancelled) callback()
  }

  const cancelFrame = scheduleIktiaPresenceFrame(() => {
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
