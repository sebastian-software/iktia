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
        Boolean(element.shadowRoot?.querySelector("[data-lean-root]")) &&
        Boolean(element.shadowRoot?.querySelector("[data-lean-text='text0']"))
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
        __leanWcUpgrade(): Promise<unknown>
      }
    ).__leanWcUpgrade()
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
      ?.querySelector("[data-lean-node='node0']")
      ?.removeAttribute("data-lean-node")
  })

  await page.evaluate(() =>
    (
      window as unknown as Window & {
        __leanWcUpgrade(): Promise<unknown>
      }
    )
      .__leanWcUpgrade()
      .catch(() => undefined)
  )

  await expect
    .poll(() => pageErrors.some((message) => message.includes("lean-wc hydration mismatch")))
    .toBe(true)
})
