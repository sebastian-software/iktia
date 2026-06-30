import { describe, expect, it } from "vitest"

import {
  flipMovedElements,
  prefersReducedMotion,
  spring,
  springEasing,
  springMotionToken,
  waitForAnimations,
} from "./index.js"

describe("@naos-ui/motion", () => {
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

  it("generates deterministic spring motion token classes and CSS", () => {
    const preset = springMotionToken({ kind: "presence", preset: "snappy" })
    const custom = springMotionToken({
      kind: "presence",
      options: { damping: 22, mass: 1, maxDuration: 420, stiffness: 420 },
    })
    const sameCustom = springMotionToken({
      kind: "presence",
      options: { maxDuration: 420, stiffness: 420, damping: 22, mass: 1 },
    })

    expect(preset.className).toBe("naos-motion-presence-spring-snappy")
    expect(preset.css).toContain(".naos-motion-presence-spring-snappy")
    expect(preset.css).toContain("--naos-presence-motion-duration: ")
    expect(preset.css).toContain("--naos-presence-motion-easing: linear(")
    expect(custom.className).toBe(sameCustom.className)
    expect(custom.css).toBe(sameCustom.css)
  })

  it("animates moved elements from their previous rect", () => {
    const originalGetComputedStyle = globalThis.getComputedStyle
    const animateCalls: unknown[] = []
    const element = {
      animate: (...args: unknown[]) => {
        animateCalls.push(args)
        return { playState: "running" }
      },
      getBoundingClientRect: () => ({
        bottom: 20,
        height: 20,
        left: 10,
        right: 110,
        top: 0,
        width: 100,
        x: 10,
        y: 0,
        toJSON: () => ({}),
      }),
    } as unknown as Element

    try {
      globalThis.getComputedStyle = ((() => ({
        transform: "scale(1)",
      })) as unknown) as typeof getComputedStyle

      const animations = flipMovedElements(
        new Map([
          [
            element,
            {
              bottom: 56,
              height: 20,
              left: 30,
              right: 130,
              top: 36,
              width: 100,
              x: 30,
              y: 36,
              toJSON: () => ({}),
            },
          ],
        ]),
        { duration: 180, easing: "linear" }
      )

      expect(animations).toHaveLength(1)
      expect(animateCalls).toHaveLength(1)
      expect(animateCalls[0]).toEqual([
        [
          { transform: "translate(20px, 36px) scale(1)" },
          { transform: "scale(1)" },
        ],
        { duration: 180, easing: "linear" },
      ])
    } finally {
      globalThis.getComputedStyle = originalGetComputedStyle
    }
  })

  it("skips FLIP when reduced motion is requested", () => {
    const element = {
      animate: () => {
        throw new Error("reduced motion should not animate")
      },
      getBoundingClientRect: () => {
        throw new Error("reduced motion should not measure")
      },
    } as unknown as Element

    expect(
      flipMovedElements(new Map([[element, {} as DOMRectReadOnly]]), {
        reducedMotion: true,
      })
    ).toEqual([])
  })
})
