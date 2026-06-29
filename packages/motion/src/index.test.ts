import { describe, expect, it } from "vitest"

import {
  prefersReducedMotion,
  spring,
  springEasing,
  waitForAnimations,
} from "./index.js"

describe("@iktia/motion", () => {
  it("resolves animation waits without DOM animation support", async () => {
    await expect(waitForAnimations(null)).resolves.toBeUndefined()
    await expect(waitForAnimations({} as Element)).resolves.toBeUndefined()
  })

  it("waits for pending animations and forwards subtree lookup", async () => {
    let resolveFinished: () => void = () => undefined
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve
    })
    const calls: boolean[] = []
    const element = {
      getAnimations: (options?: GetAnimationsOptions) => {
        calls.push(options?.subtree ?? false)
        return [
          { finished: Promise.resolve(), playState: "finished" },
          { finished, playState: "running" },
        ]
      },
    } as unknown as Element

    const wait = waitForAnimations(element, { timeout: false })
    let settled = false
    void wait.then(() => {
      settled = true
    })

    await Promise.resolve()
    expect(settled).toBe(false)

    resolveFinished()
    await wait
    expect(settled).toBe(true)
    expect(calls).toEqual([true])
  })

  it("resolves pending animation waits when aborted", async () => {
    const controller = new AbortController()
    const element = {
      getAnimations: () => [
        { finished: new Promise(() => undefined), playState: "running" },
      ],
    } as unknown as Element

    const wait = waitForAnimations(element, {
      signal: controller.signal,
      timeout: false,
    })
    let settled = false
    void wait.then(() => {
      settled = true
    })

    await Promise.resolve()
    expect(settled).toBe(false)

    controller.abort()
    await wait
    expect(settled).toBe(true)
  })

  it("skips animation waits when reduced motion is requested", async () => {
    const element = {
      getAnimations: () => {
        throw new Error("reduced motion should not read animations")
      },
    } as unknown as Element

    await expect(waitForAnimations(element, { reducedMotion: true }))
      .resolves.toBeUndefined()
  })

  it("reports reduced-motion media preference defensively", () => {
    const originalMatchMedia = globalThis.matchMedia
    try {
      globalThis.matchMedia = ((query: string) => ({
        addEventListener: () => undefined,
        addListener: () => undefined,
        dispatchEvent: () => true,
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        removeEventListener: () => undefined,
        removeListener: () => undefined,
      })) as typeof matchMedia

      expect(prefersReducedMotion()).toBe(true)
      expect(prefersReducedMotion("(prefers-contrast: more)")).toBe(false)
    } finally {
      globalThis.matchMedia = originalMatchMedia
    }
  })

  it("generates spring-quality CSS timing", () => {
    const timing = spring("snappy")

    expect(timing.duration).toBeGreaterThan(0)
    expect(timing.duration).toBeLessThanOrEqual(420)
    expect(timing.easing).toMatch(/^linear\(0, /)
    expect(timing.easing.endsWith(", 1)")).toBe(true)
    expect(springEasing({ damping: 26, stiffness: 300 })).toMatch(/^linear\(/)
  })
})
