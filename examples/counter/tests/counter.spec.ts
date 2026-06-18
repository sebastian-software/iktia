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
  const primaryButton = section.locator("iktia-button[variant='primary']")
  const radioGroup = section.locator("iktia-radio-group")
  const radios = radioGroup.locator("iktia-radio")
  const toggleGroup = section.locator("iktia-toggle-group")
  const toggleItems = toggleGroup.locator("iktia-toggle-item")
  const tabs = section.locator("iktia-tabs")
  const firstPanel = tabs.locator("[part~='panel'][data-value='first']")
  const secondPanel = tabs.locator("[part~='panel'][data-value='second']")
  const dropdown = section.locator("iktia-dropdown")
  const form = section.locator("#primitive-form")

  await expect(primaryButton.locator("button")).toHaveAttribute(
    "part",
    "root control"
  )
  await expect(checkboxButton).toHaveAttribute("role", "checkbox")
  await expect(checkboxButton).toHaveAttribute("data-state", "unchecked")
  await expect(toggleButton).toHaveAttribute("data-state", "off")
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
  await expect(tabs.locator("[role='tab']")).toHaveCount(3)
  await expect(firstPanel).toBeVisible()
  await expect(secondPanel).toBeHidden()

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

  await form.locator("button[type='submit']").click()
  await expect(page.locator("body")).toHaveAttribute(
    "data-last-primitive-form",
    "docs:reviewed, preview:enabled, audience:stable, channels:docs"
  )
  await expect(page.locator("#primitive-form-event")).toHaveText(
    "Last primitive form data: docs:reviewed, preview:enabled, audience:stable, channels:docs"
  )

  await form.locator("button[type='reset']").click()
  await expect(checkboxButton).toHaveAttribute("data-state", "unchecked")
  await expect(toggleButton).toHaveAttribute("data-state", "off")
  await expect(radios.nth(0)).toHaveAttribute("data-state", "unchecked")
  await expect(toggleItems.nth(0)).toHaveAttribute("data-state", "on")
  await expect(toggleItems.nth(1)).toHaveAttribute("data-state", "off")
  await expect(page.locator("body")).toHaveAttribute(
    "data-last-primitive-form",
    "channels:web"
  )

  await tabs.locator("[role='tab']").nth(1).click()
  await expect(firstPanel).toBeHidden()
  await expect(secondPanel).toBeVisible()
  await expect(tabs.locator("[role='tab']").nth(1)).toHaveAttribute(
    "data-state",
    "selected"
  )
  await expect(page.locator("#primitive-event")).toContainText('"value":"second"')

  await tabs.locator("[role='tab']").nth(1).press("ArrowRight")
  await expect(tabs.locator("[role='tab']").nth(2)).toHaveAttribute(
    "data-state",
    "selected"
  )
  await expect(tabs.locator("[role='tab']").nth(2)).toBeFocused()
  await tabs.locator("[role='tab']").nth(2).press("Home")
  await expect(tabs.locator("[role='tab']").nth(0)).toHaveAttribute(
    "data-state",
    "selected"
  )
  await expect(tabs.locator("[role='tab']").nth(0)).toBeFocused()

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
        <iktia-radio-group name="blocked-radio" label="Blocked radio">
          <iktia-radio value="yes" label="Yes"></iktia-radio>
        </iktia-radio-group>
        <iktia-toggle-group name="blocked-toggle-group" label="Blocked toggles" multiple>
          <iktia-toggle-item value="yes" label="Yes"></iktia-toggle-item>
        </iktia-toggle-group>
      </fieldset>
    `
    document.body.append(form)
  })

  const checkboxButton = page.locator("form fieldset iktia-checkbox button")
  const radio = page.locator("form fieldset iktia-radio")
  const toggleButton = page.locator("form fieldset iktia-toggle button")
  const toggleItem = page.locator("form fieldset iktia-toggle-item")

  await expect(checkboxButton).toBeDisabled()
  await expect(toggleButton).toBeDisabled()
  await expect(radio).toHaveAttribute("aria-disabled", "true")
  await expect(toggleItem).toHaveAttribute("aria-disabled", "true")
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
  await expect(checkboxButton).toHaveAttribute("data-state", "unchecked")
  await expect(toggleButton).toHaveAttribute("data-state", "off")
  await expect(radio).toHaveAttribute("data-state", "unchecked")
  await expect(toggleItem).toHaveAttribute("data-state", "off")
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
