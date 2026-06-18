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

    expect(index).toContain("export * from \"./accordion.mjs\"")
    expect(index).toContain("export * from \"./accordion-item.mjs\"")
    expect(index).toContain("export * from \"./button.mjs\"")
    expect(index).toContain("export * from \"./button-group.mjs\"")
    expect(index).toContain("export * from \"./checkbox.mjs\"")
    expect(index).toContain("export * from \"./collapsible.mjs\"")
    expect(index).toContain("export * from \"./combobox.mjs\"")
    expect(index).toContain("export * from \"./combobox-item.mjs\"")
    expect(index).toContain("export * from \"./context-menu.mjs\"")
    expect(index).toContain("export * from \"./dialog.mjs\"")
    expect(index).toContain("export * from \"./dropdown.mjs\"")
    expect(index).toContain("export * from \"./field.mjs\"")
    expect(index).toContain("export * from \"./hover-card.mjs\"")
    expect(index).toContain("export * from \"./listbox.mjs\"")
    expect(index).toContain("export * from \"./listbox-item.mjs\"")
    expect(index).toContain("export * from \"./menu.mjs\"")
    expect(index).toContain("export * from \"./menu-item.mjs\"")
    expect(index).toContain("export * from \"./number-input.mjs\"")
    expect(index).toContain("export * from \"./popover.mjs\"")
    expect(index).toContain("export * from \"./radio.mjs\"")
    expect(index).toContain("export * from \"./radio-group.mjs\"")
    expect(index).toContain("export * from \"./segmented-control.mjs\"")
    expect(index).toContain("export * from \"./segmented-item.mjs\"")
    expect(index).toContain("export * from \"./select.mjs\"")
    expect(index).toContain("export * from \"./select-item.mjs\"")
    expect(index).toContain("export * from \"./slider.mjs\"")
    expect(index).toContain("export * from \"./switch.mjs\"")
    expect(index).toContain("export * from \"./tab.mjs\"")
    expect(index).toContain("export * from \"./tab-panel.mjs\"")
    expect(index).toContain("export * from \"./tabs.mjs\"")
    expect(index).toContain("export * from \"./tooltip.mjs\"")
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
    const accordion = readFileSync(join(distRoot, "internal", "zag", "accordion.js"), "utf8")
    const checkbox = readFileSync(join(distRoot, "internal", "zag", "checkbox.js"), "utf8")
    const collapsible = readFileSync(join(distRoot, "internal", "zag", "collapsible.js"), "utf8")
    const combobox = readFileSync(join(distRoot, "internal", "zag", "combobox.js"), "utf8")
    const dialog = readFileSync(join(distRoot, "internal", "zag", "dialog.js"), "utf8")
    const hoverCard = readFileSync(join(distRoot, "internal", "zag", "hover-card.js"), "utf8")
    const listbox = readFileSync(join(distRoot, "internal", "zag", "listbox.js"), "utf8")
    const menu = readFileSync(join(distRoot, "internal", "zag", "menu.js"), "utf8")
    const numberInput = readFileSync(join(distRoot, "internal", "zag", "number-input.js"), "utf8")
    const popover = readFileSync(join(distRoot, "internal", "zag", "popover.js"), "utf8")
    const radioGroup = readFileSync(join(distRoot, "internal", "zag", "radio-group.js"), "utf8")
    const service = readFileSync(join(distRoot, "internal", "zag", "service.js"), "utf8")
    const props = readFileSync(join(distRoot, "internal", "zag", "props.js"), "utf8")
    const scope = readFileSync(join(distRoot, "internal", "zag", "scope.js"), "utf8")
    const segmentedControl = readFileSync(join(distRoot, "internal", "zag", "segmented-control.js"), "utf8")
    const select = readFileSync(join(distRoot, "internal", "zag", "select.js"), "utf8")
    const slider = readFileSync(join(distRoot, "internal", "zag", "slider.js"), "utf8")
    const switchAdapter = readFileSync(join(distRoot, "internal", "zag", "switch.js"), "utf8")
    const tabs = readFileSync(join(distRoot, "internal", "zag", "tabs.js"), "utf8")
    const tooltip = readFileSync(join(distRoot, "internal", "zag", "tooltip.js"), "utf8")
    const toggle = readFileSync(join(distRoot, "internal", "zag", "toggle.js"), "utf8")
    const toggleGroup = readFileSync(join(distRoot, "internal", "zag", "toggle-group.js"), "utf8")

    expect(accordion).toContain("@zag-js/accordion")
    expect(accordion).toContain("syncIktiaAccordionItems")
    expect(checkbox).toContain("@zag-js/checkbox")
    expect(collapsible).toContain("@zag-js/collapsible")
    expect(combobox).toContain("@zag-js/combobox")
    expect(combobox).toContain("syncIktiaComboboxItems")
    expect(dialog).toContain("@zag-js/dialog")
    expect(hoverCard).toContain("@zag-js/hover-card")
    expect(listbox).toContain("@zag-js/listbox")
    expect(listbox).toContain("syncIktiaListboxItems")
    expect(menu).toContain("@zag-js/menu")
    expect(menu).toContain("syncIktiaMenuItems")
    expect(numberInput).toContain("@zag-js/number-input")
    expect(popover).toContain("@zag-js/popover")
    expect(radioGroup).toContain("@zag-js/radio-group")
    expect(radioGroup).toContain("syncIktiaRadioGroupItems")
    expect(service).toContain("createZagService")
    expect(props).toContain("normalizeZagProps")
    expect(scope).toContain("createZagScope")
    expect(segmentedControl).toContain("syncIktiaSegmentedItems")
    expect(segmentedControl).toContain("createIktiaZagToggleGroupService")
    expect(select).toContain("@zag-js/select")
    expect(select).toContain("syncIktiaSelectItems")
    expect(slider).toContain("@zag-js/slider")
    expect(switchAdapter).toContain("@zag-js/switch")
    expect(tabs).toContain("@zag-js/tabs")
    expect(tabs).toContain("syncIktiaTabsItems")
    expect(tooltip).toContain("@zag-js/tooltip")
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

  it("backs accordion with the private Zag adapter", () => {
    const accordion = readFileSync(join(distRoot, "accordion.mjs"), "utf8")

    expect(accordion).toContain("from \"./internal/zag/accordion.js\"")
    expect(accordion).toContain("createIktiaZagAccordionService")
    expect(accordion).toContain("syncIktiaAccordionItems")
    expect(accordion).toContain("#applySpreadAttributes")
    expect(accordion).not.toContain("@iktia/core")
    expect(accordion).not.toContain("type IktiaZagAccordionService")
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

  it("backs context menu with the private Zag menu adapter", () => {
    const contextMenu = readFileSync(join(distRoot, "context-menu.mjs"), "utf8")

    expect(contextMenu).toContain("from \"./internal/zag/menu.js\"")
    expect(contextMenu).toContain("createIktiaZagMenuService")
    expect(contextMenu).toContain("getContextTriggerProps")
    expect(contextMenu).toContain("#applySpreadAttributes")
    expect(contextMenu).not.toContain("@iktia/core")
    expect(contextMenu).not.toContain("type IktiaZagMenuService")
  })

  it("backs number input with the private Zag adapter", () => {
    const numberInput = readFileSync(join(distRoot, "number-input.mjs"), "utf8")

    expect(numberInput).toContain("from \"./internal/zag/number-input.js\"")
    expect(numberInput).toContain("createIktiaZagNumberInputService")
    expect(numberInput).toContain("#applySpreadAttributes")
    expect(numberInput).toContain("static formAssociated = true;")
    expect(numberInput).not.toContain("@iktia/core")
    expect(numberInput).not.toContain("type IktiaZagNumberInputService")
  })

  it("backs slider with the private Zag adapter", () => {
    const slider = readFileSync(join(distRoot, "slider.mjs"), "utf8")

    expect(slider).toContain("from \"./internal/zag/slider.js\"")
    expect(slider).toContain("createIktiaZagSliderService")
    expect(slider).toContain("#applySpreadAttributes")
    expect(slider).toContain("static formAssociated = true;")
    expect(slider).not.toContain("@iktia/core")
    expect(slider).not.toContain("type IktiaZagSliderService")
  })

  it("backs dialog with the private Zag adapter", () => {
    const dialog = readFileSync(join(distRoot, "dialog.mjs"), "utf8")

    expect(dialog).toContain("from \"./internal/zag/dialog.js\"")
    expect(dialog).toContain("createIktiaZagDialogService")
    expect(dialog).toContain("#applySpreadAttributes")
    expect(dialog).not.toContain("@iktia/core")
    expect(dialog).not.toContain("type IktiaZagDialogService")
  })

  it("backs collapsible with the private Zag adapter", () => {
    const collapsible = readFileSync(join(distRoot, "collapsible.mjs"), "utf8")

    expect(collapsible).toContain("from \"./internal/zag/collapsible.js\"")
    expect(collapsible).toContain("createIktiaZagCollapsibleService")
    expect(collapsible).toContain("#applySpreadAttributes")
    expect(collapsible).not.toContain("@iktia/core")
    expect(collapsible).not.toContain("type IktiaZagCollapsibleService")
  })

  it("backs popover with the private Zag adapter", () => {
    const popover = readFileSync(join(distRoot, "popover.mjs"), "utf8")

    expect(popover).toContain("from \"./internal/zag/popover.js\"")
    expect(popover).toContain("createIktiaZagPopoverService")
    expect(popover).toContain("#applySpreadAttributes")
    expect(popover).not.toContain("@iktia/core")
    expect(popover).not.toContain("type IktiaZagPopoverService")
  })

  it("backs tooltip with the private Zag adapter", () => {
    const tooltip = readFileSync(join(distRoot, "tooltip.mjs"), "utf8")

    expect(tooltip).toContain("from \"./internal/zag/tooltip.js\"")
    expect(tooltip).toContain("createIktiaZagTooltipService")
    expect(tooltip).toContain("#applySpreadAttributes")
    expect(tooltip).not.toContain("@iktia/core")
    expect(tooltip).not.toContain("type IktiaZagTooltipService")
  })

  it("backs hover card with the private Zag adapter", () => {
    const hoverCard = readFileSync(join(distRoot, "hover-card.mjs"), "utf8")

    expect(hoverCard).toContain("from \"./internal/zag/hover-card.js\"")
    expect(hoverCard).toContain("createIktiaZagHoverCardService")
    expect(hoverCard).toContain("#applySpreadAttributes")
    expect(hoverCard).not.toContain("@iktia/core")
    expect(hoverCard).not.toContain("type IktiaZagHoverCardService")
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

  it("backs switch with the private Zag adapter", () => {
    const switchComponent = readFileSync(join(distRoot, "switch.mjs"), "utf8")

    expect(switchComponent).toContain("from \"./internal/zag/switch.js\"")
    expect(switchComponent).toContain("createIktiaZagSwitchService")
    expect(switchComponent).toContain("#applySpreadAttributes")
    expect(switchComponent).toContain("static formAssociated = true;")
    expect(switchComponent).not.toContain("@iktia/core")
    expect(switchComponent).not.toContain("type IktiaZagSwitchService")
  })

  it("emits form-associated custom control output", () => {
    const checkbox = readFileSync(join(distRoot, "checkbox.mjs"), "utf8")
    const combobox = readFileSync(join(distRoot, "combobox.mjs"), "utf8")
    const listbox = readFileSync(join(distRoot, "listbox.mjs"), "utf8")
    const numberInput = readFileSync(join(distRoot, "number-input.mjs"), "utf8")
    const radioGroup = readFileSync(join(distRoot, "radio-group.mjs"), "utf8")
    const segmentedControl = readFileSync(join(distRoot, "segmented-control.mjs"), "utf8")
    const select = readFileSync(join(distRoot, "select.mjs"), "utf8")
    const slider = readFileSync(join(distRoot, "slider.mjs"), "utf8")
    const switchComponent = readFileSync(join(distRoot, "switch.mjs"), "utf8")
    const toggle = readFileSync(join(distRoot, "toggle.mjs"), "utf8")
    const toggleGroup = readFileSync(join(distRoot, "toggle-group.mjs"), "utf8")

    for (const source of [checkbox, combobox, listbox, numberInput, radioGroup, segmentedControl, select, slider, switchComponent, toggle, toggleGroup]) {
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
