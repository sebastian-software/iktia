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
