import { expect, test } from "@playwright/test"

test("compiled counter renders, updates, and emits detail", async ({ page }) => {
  await page.goto("/")

  const counter = page.locator("#counter-case x-counter")
  const button = counter.locator("button")
  await expect(counter).toHaveJSProperty("label", "Count")
  await expect(button).toHaveText("Count: 0")

  await button.click()

  await expect(button).toHaveText("Count: 1")
  await expect(page.locator("body")).toHaveAttribute("data-last-change", "1")
  await expect(page.locator("#counter-event")).toHaveText("Last counter event: 1")
})

test("compiled toggle renders primitive contracts and control flow", async ({ page }) => {
  await page.goto("/")

  const toggle = page.locator("#toggle-case x-toggle")
  const button = toggle.locator("button")

  await expect(toggle).toHaveAttribute("data-effect", "mounted")
  await expect(button).toHaveAttribute("part", "root control")
  await expect(button).toHaveAttribute("data-state", "off")
  await expect(button).toHaveAttribute("aria-pressed", "false")
  await expect(button.locator("[part~='label']")).toHaveText("Power")
  await expect(button.locator("[part~='indicator']")).toContainText(["Off", "Idle"])

  await button.click()

  await expect(button).toHaveAttribute("data-state", "on")
  await expect(button).toHaveAttribute("aria-pressed", "true")
  await expect(button.locator("[part~='indicator']")).toContainText([
    "On",
    "Pressed",
    "Active",
  ])
  await expect(page.locator("body")).toHaveAttribute("data-last-toggle", "true")
  await expect(page.locator("#toggle-event")).toHaveText("Last toggle event: true")
})

test("compiled toolbar composes nested PascalCase components", async ({ page }) => {
  await page.goto("/")

  const toolbar = page.locator("#composition-case x-toolbar")
  const counterButton = toolbar.locator("x-counter button")
  const toggleButton = toolbar.locator("x-toggle button")

  await expect(toolbar).toHaveJSProperty("label", "Composed controls")
  await expect(toolbar.locator("[part~='label']").first()).toHaveText(
    "Composed controls"
  )
  await expect(counterButton).toHaveText("Nested count: 0")
  await expect(toggleButton).toHaveAttribute("data-state", "off")

  await counterButton.click()
  await toggleButton.click()

  await expect(counterButton).toHaveText("Nested count: 1")
  await expect(toggleButton).toHaveAttribute("data-state", "on")
  await expect(page.locator("body")).toHaveAttribute("data-last-change", "1")
  await expect(page.locator("body")).toHaveAttribute("data-last-toggle", "true")
})

test("compiled elements accept host-provided css custom properties", async ({
  page,
}) => {
  await page.goto("/")

  const counter = page.locator("#theme-case x-counter")
  const toggle = page.locator("#theme-case x-toggle")

  await expect(counter.locator("button")).toHaveCSS("background-color", "rgb(245, 243, 255)")
  await expect(counter.locator("button")).toHaveCSS("color", "rgb(46, 16, 101)")
  await expect(toggle.locator("button")).toHaveCSS("background-color", "rgb(240, 253, 250)")
  await toggle.locator("button").click()
  await expect(toggle.locator("button")).toHaveCSS("background-color", "rgb(204, 251, 241)")
})

test("compiled design-system primitives expose native contracts", async ({
  page,
}) => {
  await page.goto("/")

  const disclosure = page.locator("#primitive-suite-case x-disclosure")
  const disclosureRoot = disclosure.locator("section")
  const disclosureButton = disclosure.locator("button")

  await expect(disclosureRoot).toHaveAttribute("part", "root")
  await expect(disclosureRoot).toHaveAttribute("data-state", "closed")
  await expect(disclosureButton).toHaveAttribute("part", "trigger")
  await expect(disclosureButton).toHaveAttribute("aria-expanded", "false")
  await expect(disclosureButton).toContainText("Deployment settings")
  await expect(disclosure.locator("[slot='summary']")).toHaveText("Production")

  await disclosureButton.click()

  await expect(disclosureRoot).toHaveAttribute("data-state", "open")
  await expect(disclosureButton).toHaveAttribute("aria-expanded", "true")
  await expect(disclosure.locator("[part~='panel']")).toBeVisible()
  await expect(disclosure).toContainText(
    "Publish native Custom Elements"
  )
  await expect(page.locator("body")).toHaveAttribute("data-last-disclosure", "true")
  await expect(page.locator("#disclosure-event")).toHaveText(
    "Last disclosure event: true"
  )

  const field = page.locator("#primitive-suite-case x-field")
  const fieldRoot = field.locator("label")
  const input = field.locator("input")
  const fieldAction = field.locator("button")

  await expect(fieldRoot).toHaveAttribute("part", "root")
  await expect(fieldRoot).toHaveAttribute("data-state", "valid")
  await expect(field.locator("[part~='label']")).toHaveText("Package scope")
  await expect(field.locator("[part~='hint']")).toBeVisible()
  await expect(field).toContainText(
    "Used by generated package names"
  )
  await expect(field.locator("[part~='status']")).toHaveText("Ready: @iktia")
  await expect(input).toHaveAttribute("aria-invalid", "false")
  await expect(input).toHaveValue("@iktia")
  await expect(input).toHaveCSS("border-color", "rgb(15, 118, 110)")
  await expect(fieldAction).toHaveAttribute("part", "action")

  await fieldAction.click()

  await expect(field.locator("[part~='status']")).toHaveText("Ready: @iktia/labs")
  await expect(input).toHaveValue("@iktia/labs")
  await expect(page.locator("body")).toHaveAttribute("data-last-field", "@iktia/labs")
  await expect(page.locator("#field-event")).toHaveText(
    "Last field event: @iktia/labs"
  )
})

test("packaged primitives render and dispatch package events", async ({ page }) => {
  await page.goto("/")

  const section = page.locator("#primitive-package-case")
  const checkbox = section.locator("iktia-checkbox")
  const checkboxButton = checkbox.locator("button")
  const toggle = section.locator("iktia-toggle")
  const toggleButton = toggle.locator("button")
  const switchControl = section.locator("iktia-switch")
  const switchTrack = switchControl.locator("[part~='track']")
  const primaryButton = section.locator("iktia-button[variant='primary']")
  const radioGroup = section.locator("iktia-radio-group")
  const radios = radioGroup.locator("iktia-radio")
  const toggleGroup = section.locator("iktia-toggle-group")
  const toggleItems = toggleGroup.locator("iktia-toggle-item")
  const segmentedControl = section.locator("iktia-segmented-control")
  const segments = segmentedControl.locator("iktia-segmented-item")
  const select = section.locator("iktia-select")
  const selectTrigger = select.locator("button")
  const selectItems = select.locator("iktia-select-item")
  const selectContent = select.locator("[part~='content']")
  const listbox = section.locator("iktia-listbox")
  const listboxContent = listbox.locator("[role='listbox']")
  const listboxItems = listbox.locator("iktia-listbox-item")
  const combobox = section.locator("iktia-combobox")
  const comboboxInput = combobox.locator("input")
  const comboboxTrigger = combobox.locator("button")
  const comboboxContent = combobox.locator("[part~='content']")
  const comboboxItems = combobox.locator("iktia-combobox-item")
  const numberInput = section.locator("iktia-number-input")
  const numberInputField = numberInput.locator("[part~='input']")
  const numberInputDecrement = numberInput.locator("[part~='decrement']")
  const numberInputIncrement = numberInput.locator("[part~='increment']")
  const pinInput = section.locator("iktia-pin-input")
  const pinInputRoot = pinInput.locator("[part~='root']")
  const pinInputFields = pinInput.locator("[part~='input']")
  const slider = section.locator("iktia-slider")
  const sliderControl = slider.locator("[part~='control']")
  const sliderThumb = slider.locator("[part~='thumb']")
  const menu = section.locator("iktia-menu")
  const menuTrigger = menu.locator("button")
  const menuContent = menu.locator("[part~='content']")
  const menuItems = menu.locator("iktia-menu-item")
  const contextMenu = section.locator("iktia-context-menu")
  const contextMenuTrigger = contextMenu.locator("[part~='trigger']")
  const contextMenuContent = contextMenu.locator("[part~='content']")
  const contextMenuItems = contextMenu.locator("iktia-menu-item")
  const collapsible = section.locator("iktia-collapsible")
  const collapsibleTrigger = collapsible.locator("button")
  const collapsibleContent = collapsible.locator("[part~='content']")
  const accordion = section.locator("iktia-accordion")
  const accordionRoot = accordion.locator("section[part~='root']")
  const accordionItems = accordion.locator("iktia-accordion-item")
  const popover = section.locator("iktia-popover")
  const popoverTrigger = popover.locator("[part~='trigger']")
  const popoverContent = popover.locator("[part~='content']")
  const popoverClose = popover.locator("[part~='close']")
  const dialog = section.locator("iktia-dialog")
  const dialogTrigger = dialog.locator("[part~='trigger']")
  const dialogBackdrop = dialog.locator("[part~='backdrop']")
  const dialogContent = dialog.locator("[part~='content']")
  const dialogClose = dialog.locator("[part~='close']")
  const tooltip = section.locator("iktia-tooltip")
  const tooltipTrigger = tooltip.locator("[part~='trigger']")
  const tooltipContent = tooltip.locator("[part~='content']")
  const hoverCard = section.locator("iktia-hover-card")
  const hoverCardTrigger = hoverCard.locator("[part~='trigger']")
  const hoverCardContent = hoverCard.locator("[part~='content']")
  const tabs = section.locator("iktia-tabs")
  const tabItems = tabs.locator("iktia-tab")
  const tabPanels = tabs.locator("iktia-tab-panel")
  const contractPanel = tabPanels.filter({ hasText: "Parts, slots" })
  const behaviorPanel = tabPanels.filter({ hasText: "Behavior stays" })
  const dropdown = section.locator("iktia-dropdown")
  const form = section.locator("#primitive-form")

  await expect(primaryButton.locator("button")).toHaveAttribute(
    "part",
    "root control"
  )
  await expect(checkboxButton).toHaveAttribute("role", "checkbox")
  await expect(checkboxButton).toHaveAttribute("data-state", "unchecked")
  await expect(toggleButton).toHaveAttribute("data-state", "off")
  await expect(switchTrack).toHaveAttribute("role", "switch")
  await expect(switchTrack).toHaveAttribute("data-state", "checked")
  await expect(switchTrack).toHaveAttribute("aria-checked", "true")
  await expect(radioGroup.locator("[role='radiogroup']")).toHaveAttribute(
    "data-state",
    "none"
  )
  await expect(radios).toHaveCount(3)
  await expect(radios.nth(0)).toHaveAttribute("role", "radio")
  await expect(radios.nth(0)).toHaveAttribute("data-state", "unchecked")
  await expect(radios.nth(2)).toHaveAttribute("aria-disabled", "true")
  await expect(toggleGroup.locator("[role='group']")).toHaveAttribute(
    "data-state",
    "web"
  )
  await expect(toggleItems).toHaveCount(3)
  await expect(toggleItems.nth(0)).toHaveAttribute("role", "button")
  await expect(toggleItems.nth(0)).toHaveAttribute("aria-pressed", "true")
  await expect(toggleItems.nth(2)).toHaveAttribute("aria-disabled", "true")
  await expect(segmentedControl.locator("[role='radiogroup']")).toHaveAttribute(
    "data-state",
    "weekly"
  )
  await expect(segments).toHaveCount(4)
  await expect(segments.nth(1)).toHaveAttribute("role", "radio")
  await expect(segments.nth(1)).toHaveAttribute("data-state", "selected")
  await expect(segments.nth(3)).toHaveAttribute("aria-disabled", "true")
  await expect(selectTrigger).toHaveAttribute("role", "combobox")
  await expect(selectTrigger).toHaveAttribute("data-state", "closed")
  await expect(selectTrigger.locator("[part~='value']")).toHaveText("Europe")
  await expect(selectItems).toHaveCount(4)
  await expect(selectItems.nth(1)).toHaveAttribute("role", "option")
  await expect(selectItems.nth(1)).toHaveAttribute("data-state", "checked")
  await expect(selectItems.nth(3)).toHaveAttribute("aria-disabled", "true")
  await expect(selectContent).toBeHidden()
  await expect(listboxContent).toHaveAttribute("data-state", "review")
  await expect(listboxItems).toHaveCount(4)
  await expect(listboxItems.nth(1)).toHaveAttribute("role", "option")
  await expect(listboxItems.nth(1)).toHaveAttribute("data-state", "checked")
  await expect(listboxItems.nth(2)).toHaveAttribute("aria-disabled", "true")
  await expect(comboboxInput).toHaveAttribute("role", "combobox")
  await expect(comboboxInput).toHaveValue("Operations")
  await expect(comboboxTrigger).toHaveAttribute("data-state", "closed")
  await expect(comboboxItems).toHaveCount(4)
  await expect(comboboxItems.nth(0)).toHaveAttribute("role", "option")
  await expect(comboboxItems.nth(0)).toHaveAttribute("data-state", "checked")
  await expect(comboboxItems.nth(3)).toHaveAttribute("aria-disabled", "true")
  await expect(comboboxContent).toBeHidden()
  await expect(numberInputField).toHaveAttribute("role", "spinbutton")
  await expect(numberInputField).toHaveValue("2")
  await expect(numberInputField).toHaveAttribute("aria-valuemin", "1")
  await expect(numberInputField).toHaveAttribute("aria-valuemax", "5")
  await expect(pinInputRoot).toHaveAttribute("data-state", "incomplete")
  await expect(pinInputFields).toHaveCount(4)
  await expect(pinInputFields.nth(0)).toHaveValue("1")
  await expect(pinInputFields.nth(1)).toHaveValue("2")
  await expect(pinInputFields.nth(2)).toHaveValue("3")
  await expect(pinInputFields.nth(3)).toHaveValue("")
  await expect(pinInputFields.nth(0)).toHaveAttribute("autocomplete", "one-time-code")
  await expect(sliderThumb).toHaveAttribute("role", "slider")
  await expect(sliderThumb).toHaveAttribute("aria-valuemin", "0")
  await expect(sliderThumb).toHaveAttribute("aria-valuemax", "100")
  await expect(sliderThumb).toHaveAttribute("aria-valuenow", "40")
  await expect(menuTrigger).toHaveAttribute("aria-haspopup", "menu")
  await expect(menuTrigger).toHaveAttribute("data-state", "closed")
  await expect(menuItems).toHaveCount(3)
  await expect(menuItems.nth(0)).toHaveAttribute("role", "menuitem")
  await expect(menuItems.nth(2)).toHaveAttribute("aria-disabled", "true")
  await expect(menuContent).toBeHidden()
  await expect(contextMenuTrigger).toHaveAttribute("data-state", "closed")
  await expect(contextMenuTrigger).toHaveAttribute("data-scope", "menu")
  await expect(contextMenuItems).toHaveCount(3)
  await expect(contextMenuItems.nth(0)).toHaveAttribute("role", "menuitem")
  await expect(contextMenuItems.nth(2)).toHaveAttribute("aria-disabled", "true")
  await expect(contextMenuContent).toBeHidden()
  await expect(collapsibleTrigger).toHaveAttribute("aria-expanded", "false")
  await expect(collapsibleTrigger).toHaveAttribute("data-state", "closed")
  await expect(collapsibleContent).toBeHidden()
  await expect(accordionRoot).toHaveAttribute(
    "data-state",
    "quality"
  )
  await expect(accordionItems).toHaveCount(3)
  await expect(accordionItems.nth(0)).toHaveAttribute("data-state", "open")
  await expect(accordionItems.nth(0).locator("[part~='trigger']")).toHaveAttribute(
    "aria-expanded",
    "true"
  )
  await expect(accordionItems.nth(0).locator("[part~='content']")).toBeVisible()
  await expect(accordionItems.nth(1).locator("[part~='content']")).toBeHidden()
  await expect(accordionItems.nth(2)).toHaveAttribute("aria-disabled", "true")
  await expect(accordionItems.nth(2).locator("[part~='trigger']")).toBeDisabled()
  await expect(popoverTrigger).toHaveAttribute("aria-haspopup", "dialog")
  await expect(popoverTrigger).toHaveAttribute("aria-expanded", "false")
  await expect(popoverTrigger).toHaveAttribute("data-state", "closed")
  await expect(popoverContent).toBeHidden()
  await expect(dialogTrigger).toHaveAttribute("aria-haspopup", "dialog")
  await expect(dialogTrigger).toHaveAttribute("aria-expanded", "false")
  await expect(dialogTrigger).toHaveAttribute("data-state", "closed")
  await expect(dialogBackdrop).toBeHidden()
  await expect(dialogContent).toHaveAttribute("role", "dialog")
  await expect(dialogContent).toBeHidden()
  await expect(tooltipTrigger).toHaveAttribute("data-state", "closed")
  await expect(tooltipContent).toHaveAttribute("role", "tooltip")
  await expect(tooltipContent).toBeHidden()
  await expect(hoverCardTrigger).toHaveAttribute("data-state", "closed")
  await expect(hoverCardContent).toHaveAttribute("data-scope", "hover-card")
  await expect(hoverCardContent).toBeHidden()
  await expect(tabItems).toHaveCount(3)
  await expect(tabItems.nth(0)).toHaveAttribute("role", "tab")
  await expect(tabItems.nth(0)).toHaveAttribute("data-state", "selected")
  await expect(tabPanels).toHaveCount(3)
  await expect(contractPanel).toBeVisible()
  await expect(behaviorPanel).toBeHidden()

  await primaryButton.locator("button").click()
  await expect(page.locator("#primitive-event")).toContainText(
    '"variant":"primary"'
  )

  await checkboxButton.click()
  await expect(checkboxButton).toHaveAttribute("data-state", "checked")
  await expect(page.locator("#primitive-event")).toContainText('"checked":true')

  await toggleButton.click()
  await expect(toggleButton).toHaveAttribute("data-state", "on")
  await expect(page.locator("#primitive-event")).toContainText('"pressed":true')

  await switchTrack.click()
  await expect(switchTrack).toHaveAttribute("data-state", "unchecked")
  await expect(switchTrack).toHaveAttribute("aria-checked", "false")
  await expect(page.locator("#primitive-event")).toContainText('"checked":false')
  await switchTrack.click()
  await expect(switchTrack).toHaveAttribute("data-state", "checked")
  await expect(switchTrack).toHaveAttribute("aria-checked", "true")
  await expect(page.locator("#primitive-event")).toContainText('"checked":true')

  await radios.nth(1).click()
  await expect(radios.nth(1)).toHaveAttribute("data-state", "checked")
  await expect(page.locator("#primitive-event")).toContainText('"value":"beta"')
  await expect(radios.nth(1)).toBeFocused()
  await radios.nth(1).press("ArrowLeft")
  await expect(radios.nth(0)).toHaveAttribute("data-state", "checked")
  await expect(radios.nth(0)).toBeFocused()

  await toggleItems.nth(1).click()
  await expect(toggleItems.nth(1)).toHaveAttribute("data-state", "on")
  await expect(page.locator("#primitive-event")).toContainText(
    '"value":["web","docs"]'
  )
  await expect(toggleItems.nth(1)).toBeFocused()
  await toggleItems.nth(1).press("ArrowLeft")
  await expect(toggleItems.nth(0)).toBeFocused()
  await toggleItems.nth(0).press("Space")
  await expect(toggleItems.nth(0)).toHaveAttribute("data-state", "off")
  await expect(page.locator("#primitive-event")).toContainText(
    '"value":["docs"]'
  )

  await segments.nth(2).click()
  await expect(segments.nth(2)).toHaveAttribute("data-state", "selected")
  await expect(page.locator("#primitive-event")).toContainText('"value":"monthly"')
  await expect(segments.nth(2)).toBeFocused()
  await segments.nth(2).press("ArrowLeft")
  await expect(segments.nth(1)).toHaveAttribute("data-state", "selected")
  await expect(segments.nth(1)).toBeFocused()
  await segments.nth(1).press("End")
  await expect(segments.nth(2)).toHaveAttribute("data-state", "selected")
  await expect(segments.nth(2)).toBeFocused()

  await selectTrigger.click()
  await expect(selectTrigger).toHaveAttribute("data-state", "open")
  await expect(selectContent).toBeVisible()
  await expect(page.locator("#primitive-event")).toContainText('"open":true')
  await selectItems.nth(2).click()
  await expect(selectTrigger).toHaveAttribute("data-state", "closed")
  await expect(selectContent).toBeHidden()
  await expect(selectItems.nth(2)).toHaveAttribute("data-state", "checked")
  await expect(selectTrigger.locator("[part~='value']")).toHaveText("APAC")
  await expect(page.locator("#primitive-event")).toContainText('"value":"apac"')
  await expect(selectTrigger).toBeFocused()

  await listboxContent.focus()
  await listboxContent.press("End")
  await expect(listboxItems.nth(3)).toHaveAttribute("data-highlighted", "")
  await listboxContent.press("Enter")
  await expect(listboxItems.nth(3)).toHaveAttribute("data-state", "checked")
  await expect(page.locator("#primitive-event")).toContainText('"value":["audit"]')

  await comboboxTrigger.click()
  await expect(comboboxContent).toBeVisible()
  await expect(page.locator("#primitive-event")).toContainText('"open":true')
  await comboboxItems.nth(1).click()
  await expect(comboboxContent).toBeHidden()
  await expect(comboboxItems.nth(1)).toHaveAttribute("data-state", "checked")
  await expect(comboboxInput).toHaveValue("Docs team")

  await numberInputIncrement.click()
  await expect(numberInputField).toHaveValue("3")
  await expect(page.locator("#primitive-event")).toContainText('"value":"3"')
  await numberInputField.press("ArrowUp")
  await expect(numberInputField).toHaveValue("4")
  await numberInputDecrement.click()
  await expect(numberInputField).toHaveValue("3")

  await pinInputFields.nth(3).fill("4")
  await expect(pinInputRoot).toHaveAttribute("data-state", "complete")
  await expect(page.locator("#primitive-event")).toContainText('"value":"1234"')

  await sliderThumb.evaluate((element) => {
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: "ArrowRight",
      })
    )
  })
  await expect(sliderThumb).toHaveAttribute("aria-valuenow", "50")
  await expect(page.locator("#primitive-event")).toContainText('"value":50')
  const sliderBox = await sliderControl.boundingBox()
  if (sliderBox == null) throw new Error("Slider control box missing")
  await page.mouse.click(sliderBox.x + sliderBox.width * 0.8, sliderBox.y + sliderBox.height / 2)
  await expect(sliderThumb).toHaveAttribute("aria-valuenow", "80")

  await form.locator("button[type='submit']").click()
  await expect(page.locator("body")).toHaveAttribute(
    "data-last-primitive-form",
    "docs:reviewed, preview:enabled, notify:enabled, audience:stable, channels:docs, cadence:monthly, region:apac, lane:audit, owner:docs, approvals:3, release-code:1234, confidence:80"
  )
  await expect(page.locator("#primitive-form-event")).toHaveText(
    "Last primitive form data: docs:reviewed, preview:enabled, notify:enabled, audience:stable, channels:docs, cadence:monthly, region:apac, lane:audit, owner:docs, approvals:3, release-code:1234, confidence:80"
  )

  await form.locator("button[type='reset']").click()
  await expect(checkboxButton).toHaveAttribute("data-state", "unchecked")
  await expect(toggleButton).toHaveAttribute("data-state", "off")
  await expect(switchTrack).toHaveAttribute("data-state", "checked")
  await expect(radios.nth(0)).toHaveAttribute("data-state", "unchecked")
  await expect(toggleItems.nth(0)).toHaveAttribute("data-state", "on")
  await expect(toggleItems.nth(1)).toHaveAttribute("data-state", "off")
  await expect(segments.nth(1)).toHaveAttribute("data-state", "selected")
  await expect(selectItems.nth(1)).toHaveAttribute("data-state", "checked")
  await expect(selectTrigger.locator("[part~='value']")).toHaveText("Europe")
  await expect(listboxItems.nth(1)).toHaveAttribute("data-state", "checked")
  await expect(comboboxItems.nth(0)).toHaveAttribute("data-state", "checked")
  await expect(comboboxInput).toHaveValue("Operations")
  await expect(numberInputField).toHaveValue("2")
  await expect(pinInputRoot).toHaveAttribute("data-state", "incomplete")
  await expect(pinInputFields.nth(0)).toHaveValue("1")
  await expect(pinInputFields.nth(1)).toHaveValue("2")
  await expect(pinInputFields.nth(2)).toHaveValue("3")
  await expect(pinInputFields.nth(3)).toHaveValue("")
  await expect(sliderThumb).toHaveAttribute("aria-valuenow", "40")
  await expect(page.locator("body")).toHaveAttribute(
    "data-last-primitive-form",
    "notify:enabled, channels:web, cadence:weekly, region:eu, lane:review, owner:ops, approvals:2, release-code:123, confidence:40"
  )

  await combobox.evaluate((element) => {
    const item = document.createElement("iktia-combobox-item")
    item.setAttribute("value", "support")
    item.setAttribute("label", "Support")
    element.append(item)
  })
  await expect(comboboxItems).toHaveCount(5)
  await comboboxTrigger.click()
  await comboboxItems.nth(4).click()
  await expect(comboboxItems.nth(4)).toHaveAttribute("data-state", "checked")
  await expect(comboboxInput).toHaveValue("Support")

  await select.evaluate((element) => {
    const item = document.createElement("iktia-select-item")
    item.setAttribute("value", "latam")
    item.setAttribute("label", "LATAM")
    element.append(item)
  })
  await expect(selectItems).toHaveCount(5)
  await selectTrigger.click()
  await selectItems.nth(4).click()
  await expect(selectItems.nth(4)).toHaveAttribute("data-state", "checked")
  await expect(selectTrigger.locator("[part~='value']")).toHaveText("LATAM")
  await expect(page.locator("#primitive-event")).toContainText('"value":"latam"')

  await listbox.evaluate((element) => {
    const item = document.createElement("iktia-listbox-item")
    item.setAttribute("value", "hotfix")
    item.setAttribute("label", "Hotfix")
    element.append(item)
  })
  await expect(listboxItems).toHaveCount(5)
  await listboxItems.nth(4).click()
  await expect(listboxItems.nth(4)).toHaveAttribute("data-state", "checked")
  await expect(page.locator("#primitive-event")).toContainText('"value":["hotfix"]')

  await segmentedControl.evaluate((element) => {
    const item = document.createElement("iktia-segmented-item")
    item.setAttribute("value", "quarterly")
    item.setAttribute("label", "Quarterly")
    element.append(item)
  })
  await expect(segments).toHaveCount(5)
  await segments.nth(4).click()
  await expect(segments.nth(4)).toHaveAttribute("data-state", "selected")
  await expect(page.locator("#primitive-event")).toContainText('"value":"quarterly"')

  await tabItems.nth(1).click()
  await expect(contractPanel).toBeHidden()
  await expect(behaviorPanel).toBeVisible()
  await expect(tabItems.nth(1)).toHaveAttribute(
    "data-state",
    "selected"
  )
  await expect(page.locator("#primitive-event")).toContainText(
    '"value":"behavior"'
  )

  await tabItems.nth(1).press("ArrowRight")
  await expect(tabItems.nth(2)).toHaveAttribute(
    "data-state",
    "selected"
  )
  await expect(tabItems.nth(2)).toBeFocused()
  await tabItems.nth(2).press("Home")
  await expect(tabItems.nth(0)).toHaveAttribute(
    "data-state",
    "selected"
  )
  await expect(tabItems.nth(0)).toBeFocused()

  await tabs.evaluate((element) => {
    const disabledTab = document.createElement("iktia-tab")
    disabledTab.setAttribute("value", "audit")
    disabledTab.setAttribute("label", "Audit")
    disabledTab.setAttribute("disabled", "")
    const disabledPanel = document.createElement("iktia-tab-panel")
    disabledPanel.setAttribute("value", "audit")
    disabledPanel.textContent = "Disabled audit panel."
    element.append(disabledTab, disabledPanel)
  })
  await expect(tabItems).toHaveCount(4)
  await expect(tabItems.nth(3)).toHaveAttribute("aria-disabled", "true")
  await tabItems.nth(0).press("End")
  await expect(tabItems.nth(2)).toHaveAttribute("data-state", "selected")
  await expect(tabItems.nth(2)).toBeFocused()

  await tabs.evaluate((element) => {
    const tab = document.createElement("iktia-tab")
    tab.setAttribute("value", "metrics")
    tab.setAttribute("label", "Metrics")
    const panel = document.createElement("iktia-tab-panel")
    panel.setAttribute("value", "metrics")
    panel.textContent = "Runtime metrics panel."
    element.append(tab, panel)
  })
  await expect(tabItems).toHaveCount(5)
  await tabItems.nth(4).click()
  await expect(tabItems.nth(4)).toHaveAttribute("data-state", "selected")
  await expect(tabPanels.filter({ hasText: "Runtime metrics" })).toBeVisible()

  await dropdown.locator("button").click()
  await expect(dropdown.locator("[part~='panel']")).toBeVisible()
  await expect(page.locator("#primitive-event")).toContainText('"open":true')
  await dropdown.locator("button").press("Escape")
  await expect(dropdown.locator("[part~='panel']")).toBeHidden()
  await expect(dropdown.locator("button")).toBeFocused()

  await dropdown.locator("button").click()
  await expect(dropdown.locator("[part~='panel']")).toBeVisible()
  await page.locator("#counter-case").click()
  await expect(dropdown.locator("[part~='panel']")).toBeHidden()
  await expect(dropdown.locator("button")).toBeFocused()

  await menuTrigger.click()
  await expect(menuTrigger).toHaveAttribute("data-state", "open")
  await expect(menuContent).toBeVisible()
  await expect(page.locator("#primitive-event")).toContainText('"open":true')
  await menuItems.nth(1).click()
  await expect(menuTrigger).toHaveAttribute("data-state", "closed")
  await expect(menuContent).toBeHidden()
  await expect(page.locator("#primitive-event")).toContainText('"value":"schedule"')
  await expect(menuTrigger).toBeFocused()

  await menuTrigger.click()
  await expect(menuContent).toBeVisible()
  await menuContent.focus()
  await menuContent.press("Escape")
  await expect(menuContent).toBeHidden()
  await expect(menuTrigger).toBeFocused()

  await menuTrigger.click()
  await expect(menuContent).toBeVisible()
  await page.locator("#counter-case").click()
  await expect(menuContent).toBeHidden()
  await expect(menuTrigger).toBeFocused()

  await menu.evaluate((element) => {
    const item = document.createElement("iktia-menu-item")
    item.setAttribute("value", "audit")
    item.setAttribute("label", "Audit release")
    element.append(item)
  })
  await expect(menuItems).toHaveCount(4)
  await menuTrigger.click()
  await menuItems.nth(3).click()
  await expect(page.locator("#primitive-event")).toContainText('"value":"audit"')

  await contextMenuTrigger.click({ button: "right" })
  await expect(contextMenuTrigger).toHaveAttribute("data-state", "open")
  await expect(contextMenuContent).toBeVisible()
  await expect(page.locator("#primitive-event")).toContainText('"open":true')
  await contextMenuContent.press("Escape")
  await expect(contextMenuContent).toBeHidden()
  await expect(page.locator("#primitive-event")).toContainText('"open":false')

  await contextMenuTrigger.click({ button: "right" })
  await expect(contextMenuContent).toBeVisible()
  await page.locator("#counter-case").click()
  await expect(contextMenuContent).toBeHidden()

  await contextMenuTrigger.click({ button: "right" })
  await expect(contextMenuContent).toBeVisible()
  await contextMenuItems.nth(1).click()
  await expect(contextMenuContent).toBeHidden()
  await expect(page.locator("#primitive-event")).toContainText('"value":"assign"')

  await collapsibleTrigger.click()
  await expect(collapsibleTrigger).toHaveAttribute("aria-expanded", "true")
  await expect(collapsibleTrigger).toHaveAttribute("data-state", "open")
  await expect(collapsibleContent).toBeVisible()
  await expect(page.locator("#primitive-event")).toContainText('"open":true')
  await collapsibleTrigger.click()
  await expect(collapsibleTrigger).toHaveAttribute("aria-expanded", "false")
  await expect(collapsibleContent).toBeHidden()
  await expect(page.locator("#primitive-event")).toContainText('"open":false')

  await page.evaluate(() => {
    const collapsible = document.createElement("iktia-collapsible")
    collapsible.setAttribute("label", "Disabled notes")
    collapsible.setAttribute("disabled", "")
    document.querySelector("#primitive-package-case .primitive-stack")?.append(collapsible)
  })
  const disabledCollapsible = section.locator("iktia-collapsible").nth(1)
  await expect(disabledCollapsible.locator("button")).toBeDisabled()
  await expect(disabledCollapsible.locator("[part~='content']")).toBeHidden()

  await accordionItems.nth(1).locator("[part~='trigger']").click()
  await expect(accordionItems.nth(0)).toHaveAttribute("data-state", "closed")
  await expect(accordionItems.nth(1)).toHaveAttribute("data-state", "open")
  await expect(accordionItems.nth(1).locator("[part~='content']")).toBeVisible()
  await expect(page.locator("#primitive-event")).toContainText(
    '"value":["handoff"]'
  )
  await accordionItems.nth(1).locator("[part~='trigger']").press("ArrowUp")
  await expect(accordionItems.nth(0).locator("[part~='trigger']")).toBeFocused()

  await accordion.evaluate((element) => {
    const item = document.createElement("iktia-accordion-item")
    item.setAttribute("value", "audit")
    item.setAttribute("label", "Audit notes")
    item.textContent = "Audit notes can be expanded after dynamic sync."
    element.append(item)
  })
  await expect(accordionItems).toHaveCount(4)
  await accordionItems.nth(3).locator("[part~='trigger']").click()
  await expect(accordionItems.nth(3)).toHaveAttribute("data-state", "open")
  await expect(page.locator("#primitive-event")).toContainText('"value":["audit"]')

  await popoverTrigger.click()
  await expect(popoverTrigger).toHaveAttribute("aria-expanded", "true")
  await expect(popoverTrigger).toHaveAttribute("data-state", "open")
  await expect(popoverContent).toBeVisible()
  await expect(page.locator("#primitive-event")).toContainText('"open":true')
  await popoverClose.click()
  await expect(popoverContent).toBeHidden()
  await expect(popoverTrigger).toBeFocused()
  await expect(page.locator("#primitive-event")).toContainText('"open":false')

  await popoverTrigger.click()
  await expect(popoverContent).toBeVisible()
  await popoverContent.press("Escape")
  await expect(popoverContent).toBeHidden()
  await expect(popoverTrigger).toBeFocused()

  await popoverTrigger.click()
  await expect(popoverContent).toBeVisible()
  await page.locator("#counter-case").click()
  await expect(popoverContent).toBeHidden()
  await expect(popoverTrigger).toBeFocused()

  await dialogTrigger.click()
  await expect(dialogTrigger).toHaveAttribute("aria-expanded", "true")
  await expect(dialogTrigger).toHaveAttribute("data-state", "open")
  await expect(dialogBackdrop).toBeVisible()
  await expect(dialogContent).toBeVisible()
  await expect(dialogContent).toHaveAttribute("aria-modal", "true")
  await expect(page.locator("#primitive-event")).toContainText('"open":true')
  await dialogClose.click()
  await expect(dialogContent).toBeHidden()
  await expect(dialogTrigger).toBeFocused()
  await expect(page.locator("#primitive-event")).toContainText('"open":false')

  await dialogTrigger.click()
  await expect(dialogContent).toBeVisible()
  await page.keyboard.press("Escape")
  await expect(dialogContent).toBeHidden()
  await expect(dialogTrigger).toBeFocused()

  await dialogTrigger.click()
  await expect(dialogContent).toBeVisible()
  await page.mouse.click(4, 4)
  await expect(dialogContent).toBeHidden()
  await expect(dialogTrigger).toBeFocused()

  await tooltipTrigger.evaluate((trigger) => {
    trigger.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true,
      pointerType: "mouse",
    }))
  })
  await expect(tooltipTrigger).toHaveAttribute("data-state", "open")
  await expect(tooltipTrigger).toHaveAttribute("aria-describedby", /.+/)
  await expect(tooltipContent).toBeVisible()
  await expect(page.locator("#primitive-event")).toContainText('"open":true')
  await page.keyboard.press("Escape")
  await expect(tooltipContent).toBeHidden()
  await expect(page.locator("#primitive-event")).toContainText('"open":false')

  await tooltipTrigger.evaluate((trigger) => {
    trigger.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true,
      pointerType: "mouse",
    }))
  })
  await expect(tooltipContent).toBeVisible()
  await tooltipTrigger.evaluate((trigger) => {
    trigger.dispatchEvent(new PointerEvent("pointerleave", {
      bubbles: true,
      pointerType: "mouse",
    }))
  })
  await expect(tooltipContent).toBeHidden()

  await hoverCardTrigger.evaluate((trigger) => {
    trigger.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true,
      pointerType: "mouse",
    }))
  })
  await expect(hoverCardTrigger).toHaveAttribute("data-state", "open")
  await expect(hoverCardContent).toBeVisible()
  await expect(page.locator("#primitive-event")).toContainText('"open":true')
  await page.keyboard.press("Escape")
  await expect(hoverCardContent).toBeHidden()
  await expect(page.locator("#primitive-event")).toContainText('"open":false')

  await hoverCardTrigger.evaluate((trigger) => {
    trigger.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true,
      pointerType: "mouse",
    }))
  })
  await expect(hoverCardContent).toBeVisible()
  await hoverCardContent.evaluate((content) => {
    content.dispatchEvent(new PointerEvent("pointerleave", {
      bubbles: true,
      pointerType: "mouse",
    }))
  })
  await expect(hoverCardContent).toBeHidden()
})

test("form-associated primitive controls receive disabled fieldset state", async ({
  page,
}) => {
  await page.goto("/")

  await page.evaluate(() => {
    const form = document.createElement("form")
    form.innerHTML = `
      <fieldset disabled>
        <iktia-checkbox name="blocked" value="yes" label="Blocked"></iktia-checkbox>
        <iktia-toggle name="blocked-toggle" value="yes" label="Blocked toggle"></iktia-toggle>
        <iktia-switch name="blocked-switch" value="yes" label="Blocked switch"></iktia-switch>
        <iktia-radio-group name="blocked-radio" label="Blocked radio">
          <iktia-radio value="yes" label="Yes"></iktia-radio>
        </iktia-radio-group>
        <iktia-toggle-group name="blocked-toggle-group" label="Blocked toggles" multiple>
          <iktia-toggle-item value="yes" label="Yes"></iktia-toggle-item>
        </iktia-toggle-group>
        <iktia-segmented-control name="blocked-segmented" label="Blocked segmented">
          <iktia-segmented-item value="yes" label="Yes"></iktia-segmented-item>
        </iktia-segmented-control>
        <iktia-select name="blocked-select" label="Blocked select">
          <iktia-select-item value="yes" label="Yes"></iktia-select-item>
        </iktia-select>
        <iktia-listbox name="blocked-listbox" label="Blocked listbox">
          <iktia-listbox-item value="yes" label="Yes"></iktia-listbox-item>
        </iktia-listbox>
        <iktia-combobox name="blocked-combobox" label="Blocked combobox">
          <iktia-combobox-item value="yes" label="Yes"></iktia-combobox-item>
        </iktia-combobox>
        <iktia-number-input name="blocked-number" label="Blocked number" value="2"></iktia-number-input>
        <iktia-pin-input name="blocked-pin" label="Blocked pin" value="12"></iktia-pin-input>
        <iktia-slider name="blocked-slider" label="Blocked slider" value="40"></iktia-slider>
      </fieldset>
    `
    document.body.append(form)
  })

  const checkboxButton = page.locator("form fieldset iktia-checkbox button")
  const radio = page.locator("form fieldset iktia-radio")
  const toggleButton = page.locator("form fieldset iktia-toggle button")
  const switchInput = page.locator("form fieldset iktia-switch input")
  const toggleItem = page.locator("form fieldset iktia-toggle-item")
  const segmentedItem = page.locator("form fieldset iktia-segmented-item")
  const selectButton = page.locator("form fieldset iktia-select button")
  const selectItem = page.locator("form fieldset iktia-select-item")
  const listboxItem = page.locator("form fieldset iktia-listbox-item")
  const comboboxInput = page.locator("form fieldset iktia-combobox input")
  const comboboxButton = page.locator("form fieldset iktia-combobox button")
  const comboboxItem = page.locator("form fieldset iktia-combobox-item")
  const numberInput = page.locator("form fieldset iktia-number-input input")
  const numberIncrement = page.locator("form fieldset iktia-number-input [part~='increment']")
  const pinInputField = page.locator("form fieldset iktia-pin-input [part~='input']").first()
  const sliderThumb = page.locator("form fieldset iktia-slider [part~='thumb']")

  await expect(checkboxButton).toBeDisabled()
  await expect(toggleButton).toBeDisabled()
  await expect(switchInput).toBeDisabled()
  await expect(selectButton).toBeDisabled()
  await expect(comboboxInput).toBeDisabled()
  await expect(comboboxButton).toBeDisabled()
  await expect(numberInput).toBeDisabled()
  await expect(numberIncrement).toBeDisabled()
  await expect(pinInputField).toBeDisabled()
  await expect(sliderThumb).toHaveAttribute("aria-disabled", "true")
  await expect(radio).toHaveAttribute("aria-disabled", "true")
  await expect(toggleItem).toHaveAttribute("aria-disabled", "true")
  await expect(segmentedItem).toHaveAttribute("aria-disabled", "true")
  await expect(selectItem).toHaveAttribute("aria-disabled", "true")
  await expect(listboxItem).toHaveAttribute("aria-disabled", "true")
  await expect(comboboxItem).toHaveAttribute("aria-disabled", "true")
  await checkboxButton.evaluate((button) =>
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  )
  await toggleButton.evaluate((button) =>
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  )
  await radio.evaluate((item) =>
    item.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  )
  await toggleItem.evaluate((item) =>
    item.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  )
  await segmentedItem.evaluate((item) =>
    item.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  )
  await selectItem.evaluate((item) =>
    item.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  )
  await listboxItem.evaluate((item) =>
    item.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  )
  await comboboxItem.evaluate((item) =>
    item.dispatchEvent(new MouseEvent("click", { bubbles: true }))
  )
  await expect(checkboxButton).toHaveAttribute("data-state", "unchecked")
  await expect(toggleButton).toHaveAttribute("data-state", "off")
  await expect(radio).toHaveAttribute("data-state", "unchecked")
  await expect(toggleItem).toHaveAttribute("data-state", "off")
  await expect(segmentedItem).toHaveAttribute("data-state", "unselected")
  await expect(selectItem).toHaveAttribute("data-state", "unchecked")
  await expect(listboxItem).toHaveAttribute("data-state", "unchecked")
  await expect(comboboxItem).toHaveAttribute("data-state", "unchecked")
})

test("declarative shadow dom renders useful DOM before upgrade and hydrates after upgrade", async ({
  page,
}) => {
  await page.goto("/dsd.html?delayUpgrade=1")

  await expect
    .poll(() => page.evaluate(() => customElements.get("x-counter") === undefined))
    .toBe(true)

  const counter = page.locator("#dsd-counter-case x-counter")
  const counterButton = counter.locator("button")
  await expect(counterButton).toHaveText("Count: 0")
  await expect(counterButton).toHaveAttribute("data-count", "0")
  await expect(
    counter.evaluate(
      (element) =>
        Boolean(element.shadowRoot?.querySelector("[data-iktia-root]")) &&
        Boolean(element.shadowRoot?.querySelector("[data-iktia-text='text0']"))
    )
  ).resolves.toBe(true)

  const toggle = page.locator("#dsd-toggle-case x-toggle")
  const toggleButton = toggle.locator("button")
  await expect(toggleButton).toHaveAttribute("part", "root control")
  await expect(toggleButton).toHaveAttribute("data-state", "off")
  await expect(toggleButton).toHaveAttribute("aria-pressed", "false")
  await expect(toggleButton.locator("[part~='label']")).toHaveText("Power")
  await expect(toggleButton.locator("[part~='indicator']")).toContainText(["Off"])

  await page.evaluate(() =>
    (
      window as unknown as Window & {
        __iktiaUpgrade(): Promise<unknown>
      }
    ).__iktiaUpgrade()
  )
  await expect
    .poll(() => page.evaluate(() => customElements.get("x-counter") !== undefined))
    .toBe(true)

  await counterButton.click()
  await expect(counterButton).toHaveText("Count: 1")
  await expect(page.locator("body")).toHaveAttribute("data-last-change", "1")

  await toggleButton.click()
  await expect(toggleButton).toHaveAttribute("data-state", "on")
  await expect(toggleButton.locator("[part~='indicator']")).toContainText([
    "On",
    "Pressed",
    "Active",
  ])
  await expect(page.locator("body")).toHaveAttribute("data-last-toggle", "true")
})

test("declarative shadow dom reports development hydration mismatches", async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on("pageerror", (error) => {
    pageErrors.push(error.message)
  })

  await page.goto("/dsd.html?delayUpgrade=1")
  await page.locator("#dsd-counter-case x-counter").evaluate((element) => {
    element.shadowRoot
      ?.querySelector("[data-iktia-node='node0']")
      ?.removeAttribute("data-iktia-node")
  })

  await page.evaluate(() =>
    (
      window as unknown as Window & {
        __iktiaUpgrade(): Promise<unknown>
      }
    )
      .__iktiaUpgrade()
      .catch(() => undefined)
  )

  await expect
    .poll(() => pageErrors.some((message) => message.includes("Iktia hydration mismatch")))
    .toBe(true)
})

test("declarative shadow dom remounts on production hydration mismatches", async ({
  page,
}) => {
  const pageErrors: string[] = []
  page.on("pageerror", (error) => {
    pageErrors.push(error.message)
  })

  await page.goto("/dsd.html?delayUpgrade=1")
  const counter = page.locator("#dsd-counter-case x-counter")
  await counter.evaluate((element) => {
    element.shadowRoot
      ?.querySelector("[data-iktia-node='node0']")
      ?.removeAttribute("data-iktia-node")
  })

  await page.evaluate(async () => {
    const response = await fetch("/src/counter.wc.tsx")
    let code = await response.text()
    code = code.replace("return import.meta.env?.DEV ?? true;", "return false;")
    code = code.replaceAll(
      "/src/counter.wc.css?inline",
      "data:text/javascript,export default %22%22"
    )
    const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }))
    try {
      await import(url)
    } finally {
      URL.revokeObjectURL(url)
    }
  })

  expect(pageErrors).toEqual([])

  const counterButton = counter.locator("button")
  await expect(counterButton).toHaveText("Count: 0")
  await expect(
    counter.evaluate((element) =>
      Boolean(element.shadowRoot?.querySelector("[data-iktia-root]"))
    )
  ).resolves.toBe(false)

  await counterButton.click()
  await expect(counterButton).toHaveText("Count: 1")
})
