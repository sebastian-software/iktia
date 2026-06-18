import { describe, expect, it } from "vitest"

import { nextCheckboxState } from "./checkbox.js"
import {
  nextDisclosureOpen,
  shouldCloseDisclosureForKey,
} from "./disclosure.js"
import { tabsValueForKey } from "./tabs.js"
import { nextTogglePressed, toggleFormValue } from "./toggle.js"
import { createZagTabsProbe } from "./zag-tabs-spike.js"

describe("primitive behavior kernels", () => {
  it("toggles pressed state and form value", () => {
    expect(nextTogglePressed(false)).toBe(true)
    expect(nextTogglePressed(true)).toBe(false)
    expect(toggleFormValue(true, "on")).toBe("on")
    expect(toggleFormValue(false, "on")).toBeNull()
  })

  it("clears checkbox indeterminate state before toggling normally", () => {
    expect(nextCheckboxState({ checked: false, indeterminate: true })).toEqual({
      checked: true,
      indeterminate: false,
    })
    expect(nextCheckboxState({ checked: true, indeterminate: false })).toEqual({
      checked: false,
      indeterminate: false,
    })
  })

  it("maps disclosure transitions", () => {
    expect(nextDisclosureOpen(false)).toBe(true)
    expect(shouldCloseDisclosureForKey("Escape")).toBe(true)
    expect(shouldCloseDisclosureForKey("Enter")).toBe(false)
  })

  it("maps tab keyboard movement", () => {
    const values = ["first", "second", "third"]

    expect(tabsValueForKey("first", "ArrowRight", values)).toBe("second")
    expect(tabsValueForKey("first", "ArrowLeft", values)).toBe("third")
    expect(tabsValueForKey("second", "Home", values)).toBe("first")
    expect(tabsValueForKey("second", "End", values)).toBe("third")
    expect(tabsValueForKey("second", "ArrowDown", values)).toBeNull()
    expect(tabsValueForKey("second", "ArrowDown", values, "vertical")).toBe("third")
  })

  it("proves the Zag tabs connect API needs a Custom Element service adapter", () => {
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame
    const originalCss = globalThis.CSS
    globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0)
      return 0
    }) as typeof requestAnimationFrame
    globalThis.CSS = {
      ...globalThis.CSS,
      escape: (value: string) => value,
    } as typeof CSS

    const probe = createZagTabsProbe({
      value: "first",
      values: ["first", "second", "third"],
    })
    const triggerProps = probe.api().getTriggerProps({ value: "second" }) as {
      onClick(event: { currentTarget: unknown; defaultPrevented: boolean }): void
    }
    triggerProps.onClick({
      currentTarget: { matches: () => false },
      defaultPrevented: false,
    })

    expect(probe.sentEvents()).toContain("TAB_CLICK")
    expect(probe.value()).toBe("second")

    const nextTriggerProps = probe.api().getTriggerProps({ value: "third" }) as {
      onClick(event: { currentTarget: unknown; defaultPrevented: boolean }): void
    }
    nextTriggerProps.onClick({
      currentTarget: { matches: () => false },
      defaultPrevented: false,
    })

    expect(probe.sentEvents()).toContain("TAB_CLICK")
    expect(probe.value()).toBe("third")

    const keyboardProbe = createZagTabsProbe({
      composite: false,
      value: "first",
      values: ["first", "second", "third"],
    })
    keyboardProbe.api().selectNext("first")

    expect(keyboardProbe.sentEvents()).toContain("ARROW_NEXT")
    expect(keyboardProbe.value()).toBe("second")

    const focusProbe = createZagTabsProbe({
      composite: true,
      value: "first",
      values: ["first", "second", "third"],
    })
    focusProbe.api().selectNext("first")

    expect(focusProbe.sentEvents()).toContain("ARROW_NEXT")
    expect(focusProbe.focusedElement()).toBe("second")

    globalThis.requestAnimationFrame = originalRequestAnimationFrame
    globalThis.CSS = originalCss
  })
})
