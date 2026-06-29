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
    expect(index).toContain("export * from \"./avatar.mjs\"")
    expect(index).toContain("export * from \"./button.mjs\"")
    expect(index).toContain("export * from \"./button-group.mjs\"")
    expect(index).toContain("export * from \"./checkbox.mjs\"")
    expect(index).toContain("export * from \"./collapsible.mjs\"")
    expect(index).toContain("export * from \"./combobox.mjs\"")
    expect(index).toContain("export * from \"./combobox-item.mjs\"")
    expect(index).toContain("export * from \"./context-menu.mjs\"")
    expect(index).toContain("export * from \"./date-picker.mjs\"")
    expect(index).toContain("export * from \"./dialog.mjs\"")
    expect(index).toContain("export * from \"./editable.mjs\"")
    expect(index).toContain("export * from \"./dropdown.mjs\"")
    expect(index).toContain("export * from \"./field.mjs\"")
    expect(index).toContain("export * from \"./file-upload.mjs\"")
    expect(index).toContain("export * from \"./hover-card.mjs\"")
    expect(index).toContain("export * from \"./listbox.mjs\"")
    expect(index).toContain("export * from \"./listbox-item.mjs\"")
    expect(index).toContain("export * from \"./menu.mjs\"")
    expect(index).toContain("export * from \"./menu-item.mjs\"")
    expect(index).toContain("export * from \"./number-input.mjs\"")
    expect(index).toContain("export * from \"./pin-input.mjs\"")
    expect(index).toContain("export * from \"./popover.mjs\"")
    expect(index).toContain("export * from \"./progress.mjs\"")
    expect(index).toContain("export * from \"./radio.mjs\"")
    expect(index).toContain("export * from \"./radio-group.mjs\"")
    expect(index).toContain("export * from \"./rating-group.mjs\"")
    expect(index).toContain("export * from \"./segmented-control.mjs\"")
    expect(index).toContain("export * from \"./segmented-item.mjs\"")
    expect(index).toContain("export * from \"./select.mjs\"")
    expect(index).toContain("export * from \"./select-item.mjs\"")
    expect(index).toContain("export * from \"./slider.mjs\"")
    expect(index).toContain("export * from \"./switch.mjs\"")
    expect(index).toContain("export * from \"./tab.mjs\"")
    expect(index).toContain("export * from \"./tab-panel.mjs\"")
    expect(index).toContain("export * from \"./tabs.mjs\"")
    expect(index).toContain("export * from \"./tags-input.mjs\"")
    expect(index).toContain("export * from \"./tooltip.mjs\"")
    expect(index).toContain("export * from \"./toast.mjs\"")
    expect(index).toContain("export * from \"./toast-root.mjs\"")
    expect(index).toContain("export * from \"./toggle.mjs\"")
    expect(index).toContain("export * from \"./toggle-group.mjs\"")
    expect(index).toContain("export * from \"./toggle-item.mjs\"")
  })

  it("keeps primitive behavior kernels private but available to compiled components", () => {
    const dropdown = readFileSync(join(distRoot, "dropdown.mjs"), "utf8")
    const hoverCardComponent = readFileSync(join(distRoot, "hover-card.mjs"), "utf8")
    const index = readFileSync(join(distRoot, "index.mjs"), "utf8")
    const popover = readFileSync(join(distRoot, "popover.mjs"), "utf8")
    const tooltipComponent = readFileSync(join(distRoot, "tooltip.mjs"), "utf8")
    const context = readFileSync(join(distRoot, "internal", "behavior", "context.js"), "utf8")
    const overlay = readFileSync(join(distRoot, "internal", "behavior", "overlay.js"), "utf8")
    const presence = readFileSync(join(distRoot, "internal", "behavior", "presence.js"), "utf8")

    expect(dropdown).toContain("from \"./internal/behavior/disclosure.js\"")
    expect(hoverCardComponent).toContain("from \"./internal/behavior/presence.js\"")
    expect(popover).toContain("from \"./internal/behavior/overlay.js\"")
    expect(popover).toContain("from \"./internal/behavior/presence.js\"")
    expect(tooltipComponent).toContain("from \"./internal/behavior/presence.js\"")
    expect(context).toContain("context-request")
    expect(context).toContain("createIktiaContext")
    expect(overlay).toContain("getIktiaOverlayStateAttributes")
    expect(presence).toContain("from \"@iktia/motion\"")
    expect(presence).toContain("waitForIktiaPresenceExit")
    expect(index).not.toContain("internal/behavior")
    expect(dropdown).not.toContain("@iktia/core")
  })

  it("builds private Zag adapter helpers without adding public exports", () => {
    const index = readFileSync(join(distRoot, "index.mjs"), "utf8")
    const accordion = readFileSync(join(distRoot, "internal", "zag", "accordion.js"), "utf8")
    const avatar = readFileSync(join(distRoot, "internal", "zag", "avatar.js"), "utf8")
    const checkbox = readFileSync(join(distRoot, "internal", "zag", "checkbox.js"), "utf8")
    const collapsible = readFileSync(join(distRoot, "internal", "zag", "collapsible.js"), "utf8")
    const combobox = readFileSync(join(distRoot, "internal", "zag", "combobox.js"), "utf8")
    const datePicker = readFileSync(join(distRoot, "internal", "zag", "date-picker.js"), "utf8")
    const dialog = readFileSync(join(distRoot, "internal", "zag", "dialog.js"), "utf8")
    const editable = readFileSync(join(distRoot, "internal", "zag", "editable.js"), "utf8")
    const fileUpload = readFileSync(join(distRoot, "internal", "zag", "file-upload.js"), "utf8")
    const hoverCard = readFileSync(join(distRoot, "internal", "zag", "hover-card.js"), "utf8")
    const listbox = readFileSync(join(distRoot, "internal", "zag", "listbox.js"), "utf8")
    const menu = readFileSync(join(distRoot, "internal", "zag", "menu.js"), "utf8")
    const numberInput = readFileSync(join(distRoot, "internal", "zag", "number-input.js"), "utf8")
    const pinInput = readFileSync(join(distRoot, "internal", "zag", "pin-input.js"), "utf8")
    const popover = readFileSync(join(distRoot, "internal", "zag", "popover.js"), "utf8")
    const progress = readFileSync(join(distRoot, "internal", "zag", "progress.js"), "utf8")
    const radioGroup = readFileSync(join(distRoot, "internal", "zag", "radio-group.js"), "utf8")
    const ratingGroup = readFileSync(join(distRoot, "internal", "zag", "rating-group.js"), "utf8")
    const service = readFileSync(join(distRoot, "internal", "zag", "service.js"), "utf8")
    const props = readFileSync(join(distRoot, "internal", "zag", "props.js"), "utf8")
    const scope = readFileSync(join(distRoot, "internal", "zag", "scope.js"), "utf8")
    const segmentedControl = readFileSync(join(distRoot, "internal", "zag", "segmented-control.js"), "utf8")
    const select = readFileSync(join(distRoot, "internal", "zag", "select.js"), "utf8")
    const slider = readFileSync(join(distRoot, "internal", "zag", "slider.js"), "utf8")
    const switchAdapter = readFileSync(join(distRoot, "internal", "zag", "switch.js"), "utf8")
    const tabs = readFileSync(join(distRoot, "internal", "zag", "tabs.js"), "utf8")
    const tagsInput = readFileSync(join(distRoot, "internal", "zag", "tags-input.js"), "utf8")
    const tooltip = readFileSync(join(distRoot, "internal", "zag", "tooltip.js"), "utf8")
    const toast = readFileSync(join(distRoot, "internal", "zag", "toast.js"), "utf8")
    const toggle = readFileSync(join(distRoot, "internal", "zag", "toggle.js"), "utf8")
    const toggleGroup = readFileSync(join(distRoot, "internal", "zag", "toggle-group.js"), "utf8")

    expect(accordion).toContain("@zag-js/accordion")
    expect(accordion).toContain("syncIktiaAccordionItems")
    expect(avatar).toContain("@zag-js/avatar")
    expect(checkbox).toContain("@zag-js/checkbox")
    expect(collapsible).toContain("@zag-js/collapsible")
    expect(combobox).toContain("@zag-js/combobox")
    expect(combobox).toContain("syncIktiaComboboxItems")
    expect(datePicker).toContain("@zag-js/date-picker")
    expect(datePicker).toContain("datePickerFormValue")
    expect(dialog).toContain("@zag-js/dialog")
    expect(editable).toContain("@zag-js/editable")
    expect(editable).toContain("editableFormValue")
    expect(fileUpload).toContain("@zag-js/file-upload")
    expect(hoverCard).toContain("@zag-js/hover-card")
    expect(listbox).toContain("@zag-js/listbox")
    expect(listbox).toContain("syncIktiaListboxItems")
    expect(menu).toContain("@zag-js/menu")
    expect(menu).toContain("syncIktiaMenuItems")
    expect(numberInput).toContain("@zag-js/number-input")
    expect(pinInput).toContain("@zag-js/pin-input")
    expect(popover).toContain("@zag-js/popover")
    expect(progress).toContain("@zag-js/progress")
    expect(radioGroup).toContain("@zag-js/radio-group")
    expect(radioGroup).toContain("IKTIA_RADIO_GROUP_CONTEXT")
    expect(radioGroup).toContain("createIktiaRadioGroupContextController")
    expect(radioGroup).not.toContain("MutationObserver")
    expect(radioGroup).not.toContain("querySelectorAll")
    expect(ratingGroup).toContain("@zag-js/rating-group")
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
    expect(tagsInput).toContain("@zag-js/tags-input")
    expect(tooltip).toContain("@zag-js/tooltip")
    expect(toast).toContain("@zag-js/toast")
    expect(toast).toContain("createIktiaZagToastGroupService")
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

  it("backs avatar with the private Zag adapter", () => {
    const avatar = readFileSync(join(distRoot, "avatar.mjs"), "utf8")

    expect(avatar).toContain("from \"./internal/zag/avatar.js\"")
    expect(avatar).toContain("createIktiaZagAvatarService")
    expect(avatar).toContain("#applySpreadAttributes")
    expect(avatar).not.toContain("@iktia/core")
    expect(avatar).not.toContain("type IktiaZagAvatarService")
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
    expect(radioGroup).toContain("createIktiaRadioGroupContextController")
    expect(radioGroup).toContain("#applySpreadAttributes")
    expect(radioGroup).not.toContain("@iktia/core")
    expect(radioGroup).not.toContain("type IktiaZagRadioGroupService")
  })

  it("backs rating group with the private Zag adapter", () => {
    const ratingGroup = readFileSync(join(distRoot, "rating-group.mjs"), "utf8")

    expect(ratingGroup).toContain("from \"./internal/zag/rating-group.js\"")
    expect(ratingGroup).toContain("createIktiaZagRatingGroupService")
    expect(ratingGroup).toContain("#applySpreadAttributes")
    expect(ratingGroup).toContain("static formAssociated = true;")
    expect(ratingGroup).not.toContain("@iktia/core")
    expect(ratingGroup).not.toContain("type IktiaZagRatingGroupService")
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

  it("backs date picker with the private Zag adapter", () => {
    const datePicker = readFileSync(join(distRoot, "date-picker.mjs"), "utf8")

    expect(datePicker).toContain("from \"./internal/zag/date-picker.js\"")
    expect(datePicker).toContain("createIktiaZagDatePickerService")
    expect(datePicker).toContain("datePickerFormValue")
    expect(datePicker).toContain("#applySpreadAttributes")
    expect(datePicker).toContain("static formAssociated = true;")
    expect(datePicker).not.toContain("@iktia/core")
    expect(datePicker).not.toContain("type IktiaZagDatePickerService")
  })

  it("backs editable with the private Zag adapter", () => {
    const editable = readFileSync(join(distRoot, "editable.mjs"), "utf8")

    expect(editable).toContain("from \"./internal/zag/editable.js\"")
    expect(editable).toContain("createIktiaZagEditableService")
    expect(editable).toContain("editableFormValue")
    expect(editable).toContain("#applySpreadAttributes")
    expect(editable).toContain("static formAssociated = true;")
    expect(editable).not.toContain("@iktia/core")
    expect(editable).not.toContain("type IktiaZagEditableService")
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

  it("backs pin input with the private Zag adapter", () => {
    const pinInput = readFileSync(join(distRoot, "pin-input.mjs"), "utf8")

    expect(pinInput).toContain("from \"./internal/zag/pin-input.js\"")
    expect(pinInput).toContain("createIktiaZagPinInputService")
    expect(pinInput).toContain("#applySpreadAttributes")
    expect(pinInput).toContain("static formAssociated = true;")
    expect(pinInput).not.toContain("@iktia/core")
    expect(pinInput).not.toContain("(index, index)")
    expect(pinInput).not.toContain("type IktiaZagPinInputService")
    expect(pinInput).not.toContain("type IktiaZagPinInputType")
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

  it("backs progress with the private Zag adapter", () => {
    const progress = readFileSync(join(distRoot, "progress.mjs"), "utf8")

    expect(progress).toContain("from \"./internal/zag/progress.js\"")
    expect(progress).toContain("createIktiaZagProgressService")
    expect(progress).toContain("#applySpreadAttributes")
    expect(progress).not.toContain("@iktia/core")
    expect(progress).not.toContain("type IktiaZagProgressService")
  })

  it("backs tooltip with the private Zag adapter", () => {
    const tooltip = readFileSync(join(distRoot, "tooltip.mjs"), "utf8")

    expect(tooltip).toContain("from \"./internal/zag/tooltip.js\"")
    expect(tooltip).toContain("createIktiaZagTooltipService")
    expect(tooltip).toContain("#applySpreadAttributes")
    expect(tooltip).not.toContain("@iktia/core")
    expect(tooltip).not.toContain("type IktiaZagTooltipService")
  })

  it("backs toast primitives with the private Zag adapter", () => {
    const toast = readFileSync(join(distRoot, "toast.mjs"), "utf8")
    const toastRoot = readFileSync(join(distRoot, "toast-root.mjs"), "utf8")

    expect(toast).toContain("from \"./internal/zag/toast.js\"")
    expect(toast).toContain("createIktiaToast")
    expect(toast).not.toContain("@iktia/core")
    expect(toastRoot).toContain("from \"./internal/zag/toast.js\"")
    expect(toastRoot).toContain("createIktiaZagToastGroupService")
    expect(toastRoot).toContain("syncIktiaToastServices")
    expect(toastRoot).toContain("#applySpreadAttributes")
    expect(toastRoot).not.toContain("@iktia/core")
    expect(toastRoot).not.toContain("type IktiaZagToastGroupService")
  })

  it("backs hover card with the private Zag adapter", () => {
    const hoverCard = readFileSync(join(distRoot, "hover-card.mjs"), "utf8")

    expect(hoverCard).toContain("from \"./internal/zag/hover-card.js\"")
    expect(hoverCard).toContain("createIktiaZagHoverCardService")
    expect(hoverCard).toContain("#applySpreadAttributes")
    expect(hoverCard).not.toContain("@iktia/core")
    expect(hoverCard).not.toContain("type IktiaZagHoverCardService")
  })

  it("backs file upload with the private Zag adapter", () => {
    const fileUpload = readFileSync(join(distRoot, "file-upload.mjs"), "utf8")

    expect(fileUpload).toContain("from \"./internal/zag/file-upload.js\"")
    expect(fileUpload).toContain("createIktiaZagFileUploadService")
    expect(fileUpload).toContain("#applySpreadAttributes")
    expect(fileUpload).toContain("static formAssociated = true;")
    expect(fileUpload).not.toContain("@iktia/core")
    expect(fileUpload).not.toContain("type IktiaZagFileUploadService")
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

  it("backs tags input with the private Zag adapter", () => {
    const tagsInput = readFileSync(join(distRoot, "tags-input.mjs"), "utf8")

    expect(tagsInput).toContain("from \"./internal/zag/tags-input.js\"")
    expect(tagsInput).toContain("createIktiaZagTagsInputService")
    expect(tagsInput).toContain("#applySpreadAttributes")
    expect(tagsInput).toContain("static formAssociated = true;")
    expect(tagsInput).not.toContain("@iktia/core")
    expect(tagsInput).not.toContain("initialValue")
    expect(tagsInput).not.toContain("type IktiaZagTagsInputService")
  })

  it("emits form-associated custom control output", () => {
    const checkbox = readFileSync(join(distRoot, "checkbox.mjs"), "utf8")
    const combobox = readFileSync(join(distRoot, "combobox.mjs"), "utf8")
    const datePicker = readFileSync(join(distRoot, "date-picker.mjs"), "utf8")
    const editable = readFileSync(join(distRoot, "editable.mjs"), "utf8")
    const fileUpload = readFileSync(join(distRoot, "file-upload.mjs"), "utf8")
    const listbox = readFileSync(join(distRoot, "listbox.mjs"), "utf8")
    const numberInput = readFileSync(join(distRoot, "number-input.mjs"), "utf8")
    const pinInput = readFileSync(join(distRoot, "pin-input.mjs"), "utf8")
    const radioGroup = readFileSync(join(distRoot, "radio-group.mjs"), "utf8")
    const ratingGroup = readFileSync(join(distRoot, "rating-group.mjs"), "utf8")
    const segmentedControl = readFileSync(join(distRoot, "segmented-control.mjs"), "utf8")
    const select = readFileSync(join(distRoot, "select.mjs"), "utf8")
    const slider = readFileSync(join(distRoot, "slider.mjs"), "utf8")
    const switchComponent = readFileSync(join(distRoot, "switch.mjs"), "utf8")
    const tagsInput = readFileSync(join(distRoot, "tags-input.mjs"), "utf8")
    const toggle = readFileSync(join(distRoot, "toggle.mjs"), "utf8")
    const toggleGroup = readFileSync(join(distRoot, "toggle-group.mjs"), "utf8")

    for (const source of [checkbox, combobox, datePicker, editable, fileUpload, listbox, numberInput, pinInput, radioGroup, ratingGroup, segmentedControl, select, slider, switchComponent, tagsInput, toggle, toggleGroup]) {
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
