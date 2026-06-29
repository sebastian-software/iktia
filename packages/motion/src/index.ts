export type IktiaReducedMotionPreference = boolean | "media"

export type IktiaAnimationWaitOptions = {
  reducedMotion?: IktiaReducedMotionPreference
  signal?: AbortSignal | null
  subtree?: boolean
  timeout?: false | number
}

export type IktiaSpringOptions = {
  damping?: number
  initialVelocity?: number
  mass?: number
  maxDuration?: number
  restDelta?: number
  restSpeed?: number
  sampleCount?: number
  stiffness?: number
}

export type IktiaSpringPreset = keyof typeof motionTokens.springs

export type IktiaSpringTiming = {
  duration: number
  easing: string
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"
const DEFAULT_ANIMATION_TIMEOUT = 4000
const DEFAULT_SPRING_SAMPLE_COUNT = 24
const SPRING_STEP_SECONDS = 1 / 1000

export const motionTokens = {
  springs: {
    gentle: {
      damping: 28,
      mass: 1,
      maxDuration: 700,
      stiffness: 180,
    },
    smooth: {
      damping: 24,
      mass: 1,
      maxDuration: 550,
      stiffness: 260,
    },
    snappy: {
      damping: 22,
      mass: 1,
      maxDuration: 420,
      stiffness: 420,
    },
  },
} as const

export function prefersReducedMotion(query = REDUCED_MOTION_QUERY) {
  if (typeof globalThis.matchMedia !== "function") return false
  try {
    return globalThis.matchMedia(query).matches
  } catch {
    return false
  }
}

export function waitForAnimations(
  element: Element | null | undefined,
  options: IktiaAnimationWaitOptions = {}
) {
  if (
    element == null ||
    shouldSkipMotion(options.reducedMotion) ||
    typeof element.getAnimations !== "function"
  ) {
    return Promise.resolve()
  }

  const animations = getPendingAnimations(element, options.subtree ?? true)
  if (animations.length === 0) return Promise.resolve()

  return new Promise<void>((resolve) => {
    let settled = false
    let timeout: ReturnType<typeof globalThis.setTimeout> | undefined

    const finish = () => {
      if (settled) return
      settled = true
      if (timeout != null) globalThis.clearTimeout(timeout)
      options.signal?.removeEventListener("abort", finish)
      resolve()
    }

    if (options.signal?.aborted) {
      finish()
      return
    }

    options.signal?.addEventListener("abort", finish, { once: true })

    const timeoutMs = options.timeout ?? DEFAULT_ANIMATION_TIMEOUT
    if (timeoutMs !== false) {
      timeout = globalThis.setTimeout(finish, Math.max(0, timeoutMs))
    }

    void Promise.allSettled(animations.map((animation) => animation.finished))
      .then(finish)
  })
}

export function spring(
  options: IktiaSpringOptions | IktiaSpringPreset = "smooth"
): IktiaSpringTiming {
  const resolved = resolveSpringOptions(options)
  const duration = springDuration(resolved)
  const sampleCount = Math.max(
    2,
    Math.min(80, Math.round(resolved.sampleCount ?? DEFAULT_SPRING_SAMPLE_COUNT))
  )
  const values = Array.from({ length: sampleCount }, (_, index) => {
    const progress = index / (sampleCount - 1)
    return formatProgress(springValueAt(resolved, duration * progress))
  })

  values[0] = "0"
  values[values.length - 1] = "1"

  return {
    duration: Math.round(duration * 1000),
    easing: `linear(${values.join(", ")})`,
  }
}

export function springEasing(
  options: IktiaSpringOptions | IktiaSpringPreset = "smooth"
) {
  return spring(options).easing
}

function getPendingAnimations(element: Element, subtree: boolean) {
  try {
    return element
      .getAnimations({ subtree })
      .filter((animation) =>
        animation.playState !== "finished" && animation.playState !== "idle"
      )
  } catch {
    return []
  }
}

function shouldSkipMotion(reducedMotion: IktiaReducedMotionPreference = "media") {
  if (reducedMotion === true) return true
  if (reducedMotion === false) return false
  return prefersReducedMotion()
}

function resolveSpringOptions(options: IktiaSpringOptions | IktiaSpringPreset) {
  const base: IktiaSpringOptions =
    typeof options === "string" ? motionTokens.springs[options] : options
  return {
    damping: base.damping ?? motionTokens.springs.smooth.damping,
    initialVelocity: base.initialVelocity ?? 0,
    mass: base.mass ?? motionTokens.springs.smooth.mass,
    maxDuration: base.maxDuration ?? motionTokens.springs.smooth.maxDuration,
    restDelta: base.restDelta ?? 0.001,
    restSpeed: base.restSpeed ?? 0.001,
    sampleCount: base.sampleCount,
    stiffness: base.stiffness ?? motionTokens.springs.smooth.stiffness,
  }
}

function springDuration(options: RequiredSpringOptions) {
  let value = 0
  let velocity = options.initialVelocity
  const maxDurationSeconds = options.maxDuration / 1000

  for (
    let elapsed = 0;
    elapsed <= maxDurationSeconds;
    elapsed += SPRING_STEP_SECONDS
  ) {
    if (
      Math.abs(1 - value) <= options.restDelta &&
      Math.abs(velocity) <= options.restSpeed
    ) {
      return elapsed
    }

    const acceleration =
      (-options.stiffness * (value - 1) - options.damping * velocity) /
      options.mass
    velocity += acceleration * SPRING_STEP_SECONDS
    value += velocity * SPRING_STEP_SECONDS
  }

  return maxDurationSeconds
}

function springValueAt(options: RequiredSpringOptions, seconds: number) {
  let value = 0
  let velocity = options.initialVelocity

  for (let elapsed = 0; elapsed < seconds; elapsed += SPRING_STEP_SECONDS) {
    const step = Math.min(SPRING_STEP_SECONDS, seconds - elapsed)
    const acceleration =
      (-options.stiffness * (value - 1) - options.damping * velocity) /
      options.mass
    velocity += acceleration * step
    value += velocity * step
  }

  return value
}

function formatProgress(value: number) {
  return Number(value.toFixed(4)).toString()
}

type RequiredSpringOptions = Required<
  Omit<IktiaSpringOptions, "sampleCount">
> & Pick<IktiaSpringOptions, "sampleCount">
