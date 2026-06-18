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
    expect(index).toContain("export * from \"./collapsible.mjs\"")
    expect(index).toContain("export * from \"./combobox.mjs\"")
    expect(index).toContain("export * from \"./combobox-item.mjs\"")
    expect(index).toContain("export * from \"./dropdown.mjs\"")
    expect(index).toContain("export * from \"./field.mjs\"")
    expect(index).toContain("export * from \"./listbox.mjs\"")
    expect(index).toContain("export * from \"./listbox-item.mjs\"")
    expect(index).toContain("export * from \"./menu.mjs\"")
    expect(index).toContain("export * from \"./menu-item.mjs\"")
    expect(index).toContain("export * from \"./radio.mjs\"")
    expect(index).toContain("export * from \"./radio-group.mjs\"")
    expect(index).toContain("export * from \"./segmented-control.mjs\"")
    expect(index).toContain("export * from \"./segmented-item.mjs\"")
    expect(index).toContain("export * from \"./select.mjs\"")
    expect(index).toContain("export * from \"./select-item.mjs\"")
    expect(index).toContain("export * from \"./tab.mjs\"")
    expect(index).toContain("export * from \"./tab-panel.mjs\"")
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
    const collapsible = readFileSync(join(distRoot, "internal", "zag", "collapsible.js"), "utf8")
    const combobox = readFileSync(join(distRoot, "internal", "zag", "combobox.js"), "utf8")
    const listbox = readFileSync(join(distRoot, "internal", "zag", "listbox.js"), "utf8")
    const menu = readFileSync(join(distRoot, "internal", "zag", "menu.js"), "utf8")
    const radioGroup = readFileSync(join(distRoot, "internal", "zag", "radio-group.js"), "utf8")
    const service = readFileSync(join(distRoot, "internal", "zag", "service.js"), "utf8")
    const props = readFileSync(join(distRoot, "internal", "zag", "props.js"), "utf8")
    const scope = readFileSync(join(distRoot, "internal", "zag", "scope.js"), "utf8")
    const segmentedControl = readFileSync(join(distRoot, "internal", "zag", "segmented-control.js"), "utf8")
    const select = readFileSync(join(distRoot, "internal", "zag", "select.js"), "utf8")
    const tabs = readFileSync(join(distRoot, "internal", "zag", "tabs.js"), "utf8")
    const toggle = readFileSync(join(distRoot, "internal", "zag", "toggle.js"), "utf8")
    const toggleGroup = readFileSync(join(distRoot, "internal", "zag", "toggle-group.js"), "utf8")

    expect(checkbox).toContain("@zag-js/checkbox")
    expect(collapsible).toContain("@zag-js/collapsible")
    expect(combobox).toContain("@zag-js/combobox")
    expect(combobox).toContain("syncIktiaComboboxItems")
    expect(listbox).toContain("@zag-js/listbox")
    expect(listbox).toContain("syncIktiaListboxItems")
    expect(menu).toContain("@zag-js/menu")
    expect(menu).toContain("syncIktiaMenuItems")
    expect(radioGroup).toContain("@zag-js/radio-group")
    expect(radioGroup).toContain("syncIktiaRadioGroupItems")
    expect(service).toContain("createZagService")
    expect(props).toContain("normalizeZagProps")
    expect(scope).toContain("createZagScope")
    expect(segmentedControl).toContain("syncIktiaSegmentedItems")
    expect(segmentedControl).toContain("createIktiaZagToggleGroupService")
    expect(select).toContain("@zag-js/select")
    expect(select).toContain("syncIktiaSelectItems")
    expect(tabs).toContain("@zag-js/tabs")
    expect(tabs).toContain("syncIktiaTabsItems")
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
    expect(tabs).toContain("syncIktiaTabsItems")
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

  it("backs segmented control with the private Zag adapter", () => {
    const segmentedControl = readFileSync(join(distRoot, "segmented-control.mjs"), "utf8")

    expect(segmentedControl).toContain("from \"./internal/zag/segmented-control.js\"")
    expect(segmentedControl).toContain("createIktiaZagSegmentedControlService")
    expect(segmentedControl).toContain("syncIktiaSegmentedItems")
    expect(segmentedControl).toContain("#applySpreadAttributes")
    expect(segmentedControl).not.toContain("@iktia/core")
    expect(segmentedControl).not.toContain("type IktiaZagSegmentedControlService")
  })

  it("backs select with the private Zag adapter", () => {
    const select = readFileSync(join(distRoot, "select.mjs"), "utf8")

    expect(select).toContain("from \"./internal/zag/select.js\"")
    expect(select).toContain("createIktiaZagSelectService")
    expect(select).toContain("syncIktiaSelectItems")
    expect(select).toContain("#applySpreadAttributes")
    expect(select).not.toContain("@iktia/core")
    expect(select).not.toContain("type IktiaZagSelectService")
  })

  it("backs listbox with the private Zag adapter", () => {
    const listbox = readFileSync(join(distRoot, "listbox.mjs"), "utf8")

    expect(listbox).toContain("from \"./internal/zag/listbox.js\"")
    expect(listbox).toContain("createIktiaZagListboxService")
    expect(listbox).toContain("syncIktiaListboxItems")
    expect(listbox).toContain("listboxFormValue")
    expect(listbox).toContain("#applySpreadAttributes")
    expect(listbox).not.toContain("@iktia/core")
    expect(listbox).not.toContain("type IktiaZagListboxService")
  })

  it("backs combobox with the private Zag adapter", () => {
    const combobox = readFileSync(join(distRoot, "combobox.mjs"), "utf8")

    expect(combobox).toContain("from \"./internal/zag/combobox.js\"")
    expect(combobox).toContain("createIktiaZagComboboxService")
    expect(combobox).toContain("syncIktiaComboboxItems")
    expect(combobox).toContain("#applySpreadAttributes")
    expect(combobox).not.toContain("@iktia/core")
    expect(combobox).not.toContain("type IktiaZagComboboxService")
  })

  it("backs menu with the private Zag adapter", () => {
    const menu = readFileSync(join(distRoot, "menu.mjs"), "utf8")

    expect(menu).toContain("from \"./internal/zag/menu.js\"")
    expect(menu).toContain("createIktiaZagMenuService")
    expect(menu).toContain("syncIktiaMenuItems")
    expect(menu).toContain("#applySpreadAttributes")
    expect(menu).not.toContain("@iktia/core")
    expect(menu).not.toContain("type IktiaZagMenuService")
  })

  it("backs collapsible with the private Zag adapter", () => {
    const collapsible = readFileSync(join(distRoot, "collapsible.mjs"), "utf8")

    expect(collapsible).toContain("from \"./internal/zag/collapsible.js\"")
    expect(collapsible).toContain("createIktiaZagCollapsibleService")
    expect(collapsible).toContain("#applySpreadAttributes")
    expect(collapsible).not.toContain("@iktia/core")
    expect(collapsible).not.toContain("type IktiaZagCollapsibleService")
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
    const combobox = readFileSync(join(distRoot, "combobox.mjs"), "utf8")
    const listbox = readFileSync(join(distRoot, "listbox.mjs"), "utf8")
    const radioGroup = readFileSync(join(distRoot, "radio-group.mjs"), "utf8")
    const segmentedControl = readFileSync(join(distRoot, "segmented-control.mjs"), "utf8")
    const select = readFileSync(join(distRoot, "select.mjs"), "utf8")
    const toggle = readFileSync(join(distRoot, "toggle.mjs"), "utf8")
    const toggleGroup = readFileSync(join(distRoot, "toggle-group.mjs"), "utf8")

    for (const source of [checkbox, combobox, listbox, radioGroup, segmentedControl, select, toggle, toggleGroup]) {
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
