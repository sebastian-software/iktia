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
