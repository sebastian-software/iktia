import { expect, test } from "@playwright/test"

test("compiled counter renders, updates, and emits detail", async ({ page }) => {
  await page.goto("/")

  const counter = page.locator("x-counter")
  await expect(counter).toHaveJSProperty("label", "Count")
  await expect(page.locator("x-counter button")).toHaveText("Count: 0")

  await page.locator("x-counter button").click()

  await expect(page.locator("x-counter button")).toHaveText("Count: 1")
  await expect(page.locator("body")).toHaveAttribute("data-last-change", "1")
})

test("compiled toggle renders primitive contracts and control flow", async ({ page }) => {
  await page.goto("/")

  const toggle = page.locator("x-toggle")
  const button = page.locator("x-toggle button")

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
})
