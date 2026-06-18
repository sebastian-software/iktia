import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const distRoot = join(import.meta.dirname, "..", "dist")

describe("@iktia/primitives build output", () => {
  it("ships compiled component modules without Vite-only CSS imports", () => {
    const button = readFileSync(join(distRoot, "button.mjs"), "utf8")

    expect(button).toContain("customElements.define(\"iktia-button\"")
    expect(button).toContain("const css =")
    expect(button).not.toContain("?inline")
  })

  it("exports every first-version primitive from the package entry", () => {
    const index = readFileSync(join(distRoot, "index.mjs"), "utf8")

    expect(index).toContain("export * from \"./button.mjs\"")
    expect(index).toContain("export * from \"./button-group.mjs\"")
    expect(index).toContain("export * from \"./checkbox.mjs\"")
    expect(index).toContain("export * from \"./dropdown.mjs\"")
    expect(index).toContain("export * from \"./field.mjs\"")
    expect(index).toContain("export * from \"./radio.mjs\"")
    expect(index).toContain("export * from \"./radio-group.mjs\"")
    expect(index).toContain("export * from \"./tabs.mjs\"")
    expect(index).toContain("export * from \"./toggle.mjs\"")
    expect(index).toContain("export * from \"./toggle-group.mjs\"")
    expect(index).toContain("export * from \"./toggle-item.mjs\"")
  })

  it("keeps primitive behavior kernels private but available to compiled components", () => {
    const dropdown = readFileSync(join(distRoot, "dropdown.mjs"), "utf8")

    expect(dropdown).toContain("from \"./internal/behavior/disclosure.js\"")
    expect(dropdown).not.toContain("@iktia/core")
  })

  it("builds private Zag adapter helpers without adding public exports", () => {
    const index = readFileSync(join(distRoot, "index.mjs"), "utf8")
    const checkbox = readFileSync(join(distRoot, "internal", "zag", "checkbox.js"), "utf8")
    const radioGroup = readFileSync(join(distRoot, "internal", "zag", "radio-group.js"), "utf8")
    const service = readFileSync(join(distRoot, "internal", "zag", "service.js"), "utf8")
    const props = readFileSync(join(distRoot, "internal", "zag", "props.js"), "utf8")
    const scope = readFileSync(join(distRoot, "internal", "zag", "scope.js"), "utf8")
    const tabs = readFileSync(join(distRoot, "internal", "zag", "tabs.js"), "utf8")
    const toggle = readFileSync(join(distRoot, "internal", "zag", "toggle.js"), "utf8")
    const toggleGroup = readFileSync(join(distRoot, "internal", "zag", "toggle-group.js"), "utf8")

    expect(checkbox).toContain("@zag-js/checkbox")
    expect(radioGroup).toContain("@zag-js/radio-group")
    expect(radioGroup).toContain("syncIktiaRadioGroupItems")
    expect(service).toContain("createZagService")
    expect(props).toContain("normalizeZagProps")
    expect(scope).toContain("createZagScope")
    expect(tabs).toContain("@zag-js/tabs")
    expect(toggle).toContain("@zag-js/toggle")
    expect(toggleGroup).toContain("@zag-js/toggle-group")
    expect(toggleGroup).toContain("syncIktiaToggleGroupItems")
    expect(index).not.toContain("internal/zag")
  })

  it("backs checkbox and toggle with private Zag adapters", () => {
    const checkbox = readFileSync(join(distRoot, "checkbox.mjs"), "utf8")
    const toggle = readFileSync(join(distRoot, "toggle.mjs"), "utf8")

    expect(checkbox).toContain("from \"./internal/zag/checkbox.js\"")
    expect(checkbox).toContain("createIktiaZagCheckboxService")
    expect(checkbox).toContain("#applySpreadAttributes")
    expect(checkbox).not.toContain("from \"./internal/behavior/checkbox.js\"")
    expect(checkbox).not.toContain("type IktiaZagCheckboxService")

    expect(toggle).toContain("from \"./internal/zag/toggle.js\"")
    expect(toggle).toContain("createIktiaZagToggleService")
    expect(toggle).toContain("#applySpreadAttributes")
    expect(toggle).not.toContain("from \"./internal/behavior/toggle.js\"")
    expect(toggle).not.toContain("type IktiaZagToggleService")
  })

  it("backs tabs with the private Zag adapter", () => {
    const tabs = readFileSync(join(distRoot, "tabs.mjs"), "utf8")

    expect(tabs).toContain("from \"./internal/zag/tabs.js\"")
    expect(tabs).toContain("createIktiaZagTabsService")
    expect(tabs).toContain("#applySpreadAttributes")
    expect(tabs).not.toContain("from \"./internal/behavior/tabs.js\"")
    expect(tabs).not.toContain("type IktiaZagTabsService")
  })

  it("backs radio group with the private Zag adapter", () => {
    const radioGroup = readFileSync(join(distRoot, "radio-group.mjs"), "utf8")

    expect(radioGroup).toContain("from \"./internal/zag/radio-group.js\"")
    expect(radioGroup).toContain("createIktiaZagRadioGroupService")
    expect(radioGroup).toContain("syncIktiaRadioGroupItems")
    expect(radioGroup).toContain("#applySpreadAttributes")
    expect(radioGroup).not.toContain("@iktia/core")
    expect(radioGroup).not.toContain("type IktiaZagRadioGroupService")
  })

  it("backs toggle group with the private Zag adapter", () => {
    const toggleGroup = readFileSync(join(distRoot, "toggle-group.mjs"), "utf8")

    expect(toggleGroup).toContain("from \"./internal/zag/toggle-group.js\"")
    expect(toggleGroup).toContain("createIktiaZagToggleGroupService")
    expect(toggleGroup).toContain("syncIktiaToggleGroupItems")
    expect(toggleGroup).toContain("toggleGroupFormValue")
    expect(toggleGroup).toContain("#applySpreadAttributes")
    expect(toggleGroup).not.toContain("@iktia/core")
    expect(toggleGroup).not.toContain("type IktiaZagToggleGroupService")
  })

  it("emits form-associated custom control output", () => {
    const checkbox = readFileSync(join(distRoot, "checkbox.mjs"), "utf8")
    const radioGroup = readFileSync(join(distRoot, "radio-group.mjs"), "utf8")
    const toggle = readFileSync(join(distRoot, "toggle.mjs"), "utf8")
    const toggleGroup = readFileSync(join(distRoot, "toggle-group.mjs"), "utf8")

    for (const source of [checkbox, radioGroup, toggle, toggleGroup]) {
      expect(source).toContain("static formAssociated = true")
      expect(source).toContain("this.#internals = this.attachInternals()")
      expect(source).toContain("this.#internals.setFormValue")
      expect(source).toContain("formResetCallback()")
      expect(source).toContain("formDisabledCallback(disabled)")
    }
  })

  it("maps common DOM listener attribute names in package output", () => {
    const dropdown = readFileSync(join(distRoot, "dropdown.mjs"), "utf8")
    const tabs = readFileSync(join(distRoot, "tabs.mjs"), "utf8")

    expect(dropdown).toContain("addEventListener(\"keydown\"")
    expect(tabs).toContain("\"key-down\": \"keydown\"")
    expect(dropdown).not.toContain("addEventListener(\"key-down\"")
    expect(tabs).not.toContain("addEventListener(\"key-down\"")
  })
})
