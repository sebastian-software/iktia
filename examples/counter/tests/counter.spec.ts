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

