import { expect, type Page, test } from "@playwright/test"

type PrimitiveEventRecord = {
  detail: unknown
  type: string
}

type PresenceRecord = {
  endingStyle: boolean
  phase: string | null
}

declare global {
  interface Window {
    __naosPresenceObservers?: Record<string, MutationObserver>
    __naosPresenceRecords?: Record<string, PresenceRecord[]>
    __naosPrimitiveEvents?: PrimitiveEventRecord[]
    __naosProbeSecondaryMutationCount?: () => number
    __naosProbeSecondaryMutationObserver?: MutationObserver
    __naosSelectorMutationCounts?: Record<string, number>
    __naosSelectorMutationObserver?: MutationObserver
  }
}

async function expectPrimitiveEvent(
  page: Page,
  type: string,
  detail: unknown
) {
  const expectedDetail = JSON.stringify(detail)
  await expect
    .poll(async () =>
      page.evaluate(
        ({ expectedDetail, type }) =>
          window.__naosPrimitiveEvents?.some(
            (event) =>
              event.type === type &&
              JSON.stringify(event.detail) === expectedDetail
          ) ?? false,
        { expectedDetail, type }
      )
    )
    .toBe(true)
}

async function expectPrimitiveEventType(page: Page, type: string) {
  await expect
    .poll(async () =>
      page.evaluate(
        (type) =>
          window.__naosPrimitiveEvents?.some((event) => event.type === type) ??
          false,
        type
      )
    )
    .toBe(true)
}

async function expectShadowFocused(locator: ReturnType<Page["locator"]>) {
  await expect
    .poll(() =>
      locator.evaluate((element) => {
        const root = element.getRootNode()
        if (root instanceof ShadowRoot) {
          return root.activeElement === element
        }
        return document.activeElement === element
      })
    )
    .toBe(true)
}

async function activeForRowAnimationCount(
  locator: ReturnType<Page["locator"]>
) {
  return locator.evaluate((element) => {
    const root = element.shadowRoot ?? element
    return Array.from(root.querySelectorAll("[data-probe-for-row]")).reduce(
      (count, row) =>
        count +
        row
          .getAnimations()
          .filter((animation) => animation.playState !== "finished").length,
      0
    )
  })
}

async function observePresenceAttributes(
  locator: ReturnType<Page["locator"]>,
  key: string
) {
  await locator.evaluate((element, key) => {
    window.__naosPresenceObservers ??= {}
    window.__naosPresenceRecords ??= {}
    window.__naosPresenceObservers[key]?.disconnect()

    const records: PresenceRecord[] = []
    const capture = () => {
      records.push({
        endingStyle: element.hasAttribute("data-ending-style"),
        phase: element.getAttribute("data-naos-presence"),
      })
    }
    const observer = new MutationObserver(capture)
    capture()
    observer.observe(element, {
      attributeFilter: ["data-ending-style", "data-naos-presence"],
      attributes: true,
    })

    window.__naosPresenceObservers[key] = observer
    window.__naosPresenceRecords[key] = records
  }, key)
}

async function expectObservedClosingPresence(page: Page, key: string) {
  const records = await page.evaluate(
    (key) => window.__naosPresenceRecords?.[key] ?? [],
    key
  )
  expect(records.some((record) => record.phase === "closing")).toBe(true)
  expect(records.some((record) => record.endingStyle)).toBe(true)
}

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

test("compiled reactive output batches and gates DOM updates", async ({
  page,
}) => {
  await page.goto("/")

  const probe = page.locator("#reactivity-probe-case reactivity-probe")
  const primary = probe.locator("[data-probe-primary]")
  const secondary = probe.locator("[data-probe-secondary]")
  const primaryButton = probe.locator("[data-probe-primary-button]")
  const secondaryButton = probe.locator("[data-probe-secondary-button]")
  const batchButton = probe.locator("[data-probe-batch-button]")
  const flushButton = probe.locator("[data-probe-flush-button]")
  const body = page.locator("body")

  await expect(primary).toHaveText("0")
  await expect(secondary).toHaveText("0")
  await expect(body).toHaveAttribute("data-probe-effect-runs", "1")

  await probe.evaluate((element) => {
    const root = element.shadowRoot ?? element
    const target = root.querySelector("[data-probe-secondary]")
    if (!target) throw new Error("Missing secondary probe target.")
    let mutations = 0
    window.__naosProbeSecondaryMutationObserver?.disconnect()
    const observer = new MutationObserver(() => {
      mutations += 1
    })
    observer.observe(target, {
      characterData: true,
      childList: true,
      subtree: true,
    })
    window.__naosProbeSecondaryMutationCount = () => mutations
    window.__naosProbeSecondaryMutationObserver = observer
  })

  await secondaryButton.click()
  await expect(secondary).toHaveText("1")
  await expect(body).toHaveAttribute("data-probe-effect-runs", "1")
  const secondaryMutationsAfterSecondaryClick = await page.evaluate(
    () => window.__naosProbeSecondaryMutationCount?.() ?? -1
  )

  await primaryButton.click()
  await expect(primary).toHaveText("1")
  await expect(body).toHaveAttribute("data-probe-effect-runs", "2")
  await expect
    .poll(() =>
      page.evaluate(() => window.__naosProbeSecondaryMutationCount?.() ?? -1)
    )
    .toBe(secondaryMutationsAfterSecondaryClick)

  await batchButton.click()
  await expect(primary).toHaveText("3")
  await expect(body).toHaveAttribute("data-probe-effect-runs", "3")

  await flushButton.click()
  await expect(primary).toHaveText("4")
  await expect(body).toHaveAttribute("data-probe-before-flush", "3")
  await expect(body).toHaveAttribute("data-probe-after-flush", "4")
  await expect(body).toHaveAttribute("data-probe-effect-runs", "4")
})

test("compiled async lifecycle signals abort stale work", async ({ page }) => {
  await page.goto("/")

  const probe = page.locator("#reactivity-probe-case reactivity-probe")
  const primary = probe.locator("[data-probe-primary]")
  const primaryButton = probe.locator("[data-probe-primary-button]")
  const eventSignalButton = probe.locator("[data-probe-event-signal-button]")
  const updateSignalButton = probe.locator("[data-probe-update-signal-button]")
  const body = page.locator("body")

  await eventSignalButton.click()
  await eventSignalButton.click()
  await expect(body).toHaveAttribute("data-probe-event-abort-count", "1")
  await expect
    .poll(() =>
      page.evaluate(() => document.body.dataset.probeEventCompletedRun)
    )
    .toBe("2")
  await expect(body).toHaveAttribute("data-probe-event-signal-aborted", "false")

  await updateSignalButton.click()
  await expect(primary).toHaveText("1")
  await expect(body).toHaveAttribute("data-probe-update-signal-aborted", "false")
  await expect(body).toHaveAttribute("data-probe-queued-task-primary", "1")

  await primaryButton.click()
  await expect(primary).toHaveText("2")
  await expect(body).toHaveAttribute("data-probe-update-abort-count", "1")
})

test("compiled list reconcilers preserve keyed and indexed row nodes", async ({
  page,
}) => {
  await page.goto("/")

  const probe = page.locator("#list-reconciler-probe-case list-reconciler-probe")
  const forRows = probe.locator("[data-probe-for-row]")
  const indexRows = probe.locator("[data-probe-index-row]")

  await expect(forRows).toHaveText(["Alpha", "Beta"])
  await expect(forRows.nth(0)).toHaveAttribute("data-selected", "yes")
  await expect(forRows.nth(1)).toHaveAttribute("data-selected", "no")
  const alphaRow = await forRows.nth(0).elementHandle()
  if (!alphaRow) throw new Error("Missing initial Alpha row.")

  await probe.locator("[data-probe-for-reorder]").click()
  expect(await activeForRowAnimationCount(probe)).toBeGreaterThan(0)
  await expect(forRows).toHaveText(["Beta", "Alpha", "Gamma"])
  await expect(forRows.nth(1)).toHaveAttribute("data-index", "1")
  expect(
    await forRows
      .nth(1)
      .evaluate((element, previous) => element === previous, alphaRow)
  ).toBe(true)
  await forRows.nth(1).click()
  await expect(page.locator("body")).toHaveAttribute(
    "data-probe-for-clicked",
    "a"
  )

  await probe.evaluate((element) => {
    const root = element.shadowRoot ?? element
    const list = root.querySelector("[data-probe-for-list]")
    if (!list) throw new Error("Missing keyed selector probe list.")
    const counts: Record<string, number> = {}
    for (const row of root.querySelectorAll("[data-probe-for-row]")) {
      const id = row.getAttribute("data-id")
      if (id) counts[id] = 0
    }
    window.__naosSelectorMutationObserver?.disconnect()
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (!(record.target instanceof Element)) continue
        const id = record.target.getAttribute("data-id")
        if (!id) continue
        counts[id] = (counts[id] ?? 0) + 1
      }
    })
    observer.observe(list, {
      attributeFilter: ["aria-selected", "data-selected"],
      attributes: true,
      subtree: true,
    })
    window.__naosSelectorMutationCounts = counts
    window.__naosSelectorMutationObserver = observer
  })

  await forRows.nth(2).click()
  await expect(forRows.nth(1)).toHaveAttribute("data-selected", "no")
  await expect(forRows.nth(2)).toHaveAttribute("data-selected", "yes")
  await expect(page.locator("body")).toHaveAttribute(
    "data-probe-for-clicked",
    "c"
  )
  const selectorMutationCounts = await page.evaluate(
    () => window.__naosSelectorMutationCounts ?? {}
  )
  expect(selectorMutationCounts.a).toBeGreaterThan(0)
  expect(selectorMutationCounts.b).toBe(0)
  expect(selectorMutationCounts.c).toBeGreaterThan(0)
  await alphaRow.dispose()

  await expect(indexRows.nth(0)).toHaveValue("Alpha")
  await expect(indexRows.nth(1)).toHaveValue("Beta")
  const firstInput = await indexRows.nth(0).elementHandle()
  if (!firstInput) throw new Error("Missing initial indexed input.")

  await indexRows.nth(0).focus()
  await indexRows.nth(0).fill("Alpine")
  await expectShadowFocused(indexRows.nth(0))
  await expect(indexRows.nth(0)).toHaveValue("Alpine")
  expect(
    await indexRows
      .nth(0)
      .evaluate((element, previous) => element === previous, firstInput)
  ).toBe(true)

  await probe.locator("[data-probe-index-replace]").click()
  await expect(indexRows.nth(0)).toHaveValue("Gamma")
  expect(
    await indexRows
      .nth(0)
      .evaluate((element, previous) => element === previous, firstInput)
  ).toBe(true)
  await firstInput.dispose()
})

test("compiled keyed For FLIP respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")

  const probe = page.locator("#list-reconciler-probe-case list-reconciler-probe")
  const forRows = probe.locator("[data-probe-for-row]")

  await probe.locator("[data-probe-for-reorder]").click()
  await expect(forRows).toHaveText(["Beta", "Alpha", "Gamma"])
  expect(await activeForRowAnimationCount(probe)).toBe(0)
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

test("router package mounts Custom Element routes from normal anchors", async ({
  page,
}) => {
  await page.goto("/")

  const section = page.locator("#router-case")
  const outlet = section.locator("#router-outlet")
  const homeLink = section.locator("[data-router-to='/']")
  const productLink = section.locator("[data-router-to='/products/:id']")
  const settingsLink = section.locator("[data-router-to='/settings']")
  const missingLink = section.locator("[data-router-to='/missing']")
  const eventOutput = section.locator("#router-event")

  await expect(outlet.locator("router-home-view")).toContainText("Router home")
  await expect(homeLink).toHaveAttribute("data-active", "")
  await expect(homeLink).toHaveAttribute("aria-current", "page")

  await productLink.click()

  await expect(page).toHaveURL(/\/products\/42\?tab=details$/u)
  const productView = outlet.locator("router-product-view")
  await expect(productView).toHaveAttribute("data-product-id", "42")
  await expect(productView).toHaveJSProperty("productId", "42")
  await expect(productView).toContainText("Product 42")
  await expect(productView).toContainText("Search tab: details")
  await expect(productView).toContainText("Loader data: 18 units ready")
  await expect(productView.locator("[data-router-action-result]")).toHaveText(
    "Action result: none"
  )
  await expect(productLink).toHaveAttribute("data-active", "")
  await expect(page.locator("body")).toHaveAttribute(
    "data-last-router-route",
    "/products/42?tab=details"
  )
  await expect(eventOutput).toHaveText(
    "Last router route: /products/42?tab=details"
  )

  await productView.locator("input[name='note']").fill("Ship faster")
  await productView.getByRole("button", { name: "Save note" }).click()

  await expect(productView.locator("[data-router-action-result]")).toHaveText(
    "Action result: saved Ship faster"
  )
  await expect(page.locator("body")).toHaveAttribute(
    "data-last-router-action",
    "Ship faster"
  )
  await expect(eventOutput).toHaveText("Last router action: Ship faster")

  await settingsLink.click()

  await expect(page).toHaveURL(/\/settings$/u)
  await expect(outlet.locator("router-settings-view")).toContainText(
    "Router settings"
  )
  await expect(settingsLink).toHaveAttribute("data-active", "")

  await missingLink.click()

  await expect(page).toHaveURL(/\/missing$/u)
  await expect(outlet.locator("router-not-found-view")).toContainText(
    "Route not found"
  )
  await expect(missingLink).toHaveAttribute("data-active", "")

  await homeLink.click()

  await expect(page).toHaveURL(/\/$/u)
  await expect(outlet.locator("router-home-view")).toContainText("Router home")
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
  await expect(field.locator("[part~='status']")).toHaveText("Ready: @naos-ui")
  await expect(input).toHaveAttribute("aria-invalid", "false")
  await expect(input).toHaveValue("@naos-ui")
  await expect(input).toHaveCSS("border-color", "rgb(15, 118, 110)")
  await expect(fieldAction).toHaveAttribute("part", "action")

  await fieldAction.click()

  await expect(field.locator("[part~='status']")).toHaveText("Ready: @naos-ui/labs")
  await expect(input).toHaveValue("@naos-ui/labs")
  await expect(page.locator("body")).toHaveAttribute("data-last-field", "@naos-ui/labs")
  await expect(page.locator("#field-event")).toHaveText(
    "Last field event: @naos-ui/labs"
  )
})

test("packaged primitives render and dispatch package events", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => {
    window.__naosPrimitiveEvents = []
    for (const type of [
      "naos-cancel",
      "naos-change",
      "naos-create",
      "naos-edit-change",
      "naos-open-change",
      "naos-press",
      "naos-select",
      "naos-status-change",
      "naos-submit",
    ]) {
      document.addEventListener(type, (event) => {
        if (event instanceof CustomEvent) {
          window.__naosPrimitiveEvents?.push({ detail: event.detail, type })
        }
      })
    }
  })

  const section = page.locator("#primitive-package-case")
  const checkbox = section.locator("naos-checkbox")
  const checkboxButton = checkbox.locator("button")
  const toggle = section.locator("naos-toggle")
  const toggleButton = toggle.locator("button")
  const switchControl = section.locator("naos-switch")
  const switchTrack = switchControl.locator("[part~='track']")
  const primaryButton = section.locator("naos-button[variant='primary']")
  const radioGroup = section.locator("naos-radio-group")
  const radios = radioGroup.locator("naos-radio")
  const toggleGroup = section.locator("naos-toggle-group")
  const toggleItems = toggleGroup.locator("naos-toggle-item")
  const segmentedControl = section.locator("naos-segmented-control")
  const segments = segmentedControl.locator("naos-segmented-item")
  const select = section.locator("naos-select")
  const selectTrigger = select.locator("button")
  const selectItems = select.locator("naos-select-item")
  const selectContent = select.locator("[part~='content']")
  const listbox = section.locator("naos-listbox")
  const listboxContent = listbox.locator("[role='listbox']")
  const listboxItems = listbox.locator("naos-listbox-item")
  const combobox = section.locator("naos-combobox")
  const comboboxInput = combobox.locator("input")
  const comboboxTrigger = combobox.locator("button")
  const comboboxContent = combobox.locator("[part~='content']")
  const comboboxItems = combobox.locator("naos-combobox-item")
  const numberInput = section.locator("naos-number-input")
  const numberInputField = numberInput.locator("[part~='input']")
  const numberInputDecrement = numberInput.locator("[part~='decrement']")
  const numberInputIncrement = numberInput.locator("[part~='increment']")
  const pinInput = section.locator("naos-pin-input")
  const pinInputRoot = pinInput.locator("[part~='root']")
  const pinInputFields = pinInput.locator("[part~='input']")
  const tagsInput = section.locator("naos-tags-input")
  const tagsInputRoot = tagsInput.locator("[part~='root']")
  const tagsInputField = tagsInput.locator("[part~='input']")
  const tagItems = tagsInput.locator("[part~='item-preview']")
  const tagDeleteTriggers = tagsInput.locator("[part~='item-delete']")
  const fileUpload = section.locator("naos-file-upload")
  const fileUploadRoot = fileUpload.locator("[part~='root']")
  const fileUploadDropzone = fileUpload.locator("[part~='dropzone']")
  const fileUploadInput = fileUpload.locator("[part~='input']")
  const fileUploadItems = fileUpload.locator("[part~='item']")
  const fileUploadClear = fileUpload.locator("[part~='clear']")
  const datePicker = section.locator("naos-date-picker")
  const datePickerRoot = datePicker.locator("[part~='root']")
  const datePickerInput = datePicker.locator("[part~='input']")
  const datePickerTrigger = datePicker.locator("[part~='trigger']")
  const datePickerContent = datePicker.locator("[part~='content']")
  const datePickerTable = datePicker.locator("[part~='table']")
  const datePickerCells = datePicker.locator("[part~='cell-trigger']")
  const editable = section.locator("naos-editable")
  const editableRoot = editable.locator("[part~='root']")
  const editablePreview = editable.locator("[part~='preview']")
  const editableInput = editable.locator("[part~='input']")
  const editableEdit = editable.locator("[part~='edit']")
  const editableSubmit = editable.locator("[part~='submit']")
  const editableCancel = editable.locator("[part~='cancel']")
  const ratingGroup = section.locator("naos-rating-group")
  const ratingRoot = ratingGroup.locator("[part~='root']")
  const ratingControl = ratingGroup.locator("[part~='control']")
  const ratingItems = ratingGroup.locator("[part~='item']")
  const ratingInput = ratingGroup.locator("[part~='input']")
  const slider = section.locator("naos-slider")
  const sliderControl = slider.locator("[part~='control']")
  const sliderThumb = slider.locator("[part~='thumb']")
  const menu = section.locator("naos-menu")
  const menuTrigger = menu.locator("button")
  const menuContent = menu.locator("[part~='content']")
  const menuItems = menu.locator("naos-menu-item")
  const contextMenu = section.locator("naos-context-menu")
  const contextMenuTrigger = contextMenu.locator("[part~='trigger']")
  const contextMenuContent = contextMenu.locator("[part~='content']")
  const contextMenuItems = contextMenu.locator("naos-menu-item")
  const collapsible = section.locator("naos-collapsible")
  const collapsibleTrigger = collapsible.locator("button")
  const collapsibleContent = collapsible.locator("[part~='content']")
  const accordion = section.locator("naos-accordion")
  const accordionRoot = accordion.locator("section[part~='root']")
  const accordionItems = accordion.locator("naos-accordion-item")
  const popover = section.locator("naos-popover")
  const popoverTrigger = popover.locator("[part~='trigger']")
  const popoverContent = popover.locator("[part~='content']")
  const popoverClose = popover.locator("[part~='close']")
  const dialog = section.locator("naos-dialog")
  const dialogTrigger = dialog.locator("[part~='trigger']")
  const dialogBackdrop = dialog.locator("[part~='backdrop']")
  const dialogContent = dialog.locator("[part~='content']")
  const dialogClose = dialog.locator("[part~='close']")
  const tooltip = section.locator("naos-tooltip")
  const tooltipTrigger = tooltip.locator("[part~='trigger']")
  const tooltipContent = tooltip.locator("[part~='content']")
  const hoverCard = section.locator("naos-hover-card")
  const hoverCardTrigger = hoverCard.locator("[part~='trigger']")
  const hoverCardContent = hoverCard.locator("[part~='content']")
  const progress = section.locator("naos-progress")
  const progressRoot = progress.locator("[part~='root']")
  const progressTrack = progress.locator("[part~='track']")
  const progressRange = progress.locator("[part~='range']")
  const progressValue = progress.locator("[part~='value']")
  const avatar = section.locator("naos-avatar")
  const avatarRoot = avatar.locator("[part~='root']")
  const avatarImage = avatar.locator("[part~='image']")
  const avatarFallback = avatar.locator("[part~='fallback']")
  const toast = section.locator("naos-toast")
  const toastTrigger = toast.locator("[part~='trigger']")
  const toastRoot = section.locator("naos-toast-root")
  const toastRegion = toastRoot.locator("[part~='root']")
  const toastItems = toastRoot.locator("[part~='toast']")
  const tabs = section.locator("naos-tabs")
  const tabItems = tabs.locator("naos-tab")
  const tabPanels = tabs.locator("naos-tab-panel")
  const contractPanel = tabPanels.filter({ hasText: "Parts, slots" })
  const behaviorPanel = tabPanels.filter({ hasText: "Behavior stays" })
  const dropdown = section.locator("naos-dropdown")
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
  await expect(tagsInputRoot).toHaveAttribute("data-state", "filled")
  await expect(tagsInputRoot).toHaveAttribute("data-value", "docs,preview")
  await expect(tagItems).toHaveCount(2)
  await expect(tagItems.nth(0)).toContainText("docs")
  await expect(tagItems.nth(1)).toContainText("preview")
  await expect(tagsInputField).toHaveAttribute("autocomplete", "off")
  await expect(fileUploadRoot).toHaveAttribute("data-state", "empty")
  await expect(fileUploadDropzone).toHaveAttribute("role", "button")
  await expect(fileUploadInput).toHaveAttribute("type", "file")
  await expect(fileUploadInput).toHaveAttribute("accept", ".txt")
  await expect(fileUploadItems).toHaveCount(0)
  await expect(datePickerRoot).toHaveAttribute("data-state", "closed")
  await expect(datePickerRoot).toHaveAttribute("data-value", "2026-06-18")
  await expect(datePickerInput).toHaveValue("06/18/2026")
  await expect(datePickerTrigger).toHaveAttribute("aria-haspopup", "grid")
  await expect(datePickerContent).toBeHidden()
  await expect(datePickerCells).toHaveCount(42)
  await expect(editableRoot).toHaveAttribute("data-state", "preview")
  await expect(editableRoot).toHaveAttribute("data-value", "Launch checklist")
  await expect(editablePreview).toContainText("Launch checklist")
  await expect(editableInput).toBeHidden()
  await expect(editableEdit).toBeVisible()
  await expect(editableSubmit).toBeHidden()
  await expect(editableCancel).toBeHidden()
  await expect(ratingRoot).toHaveAttribute("data-state", "filled")
  await expect(ratingRoot).toHaveAttribute("data-value", "3")
  await expect(ratingControl).toHaveAttribute("role", "radiogroup")
  await expect(ratingItems).toHaveCount(5)
  await expect(ratingItems.nth(2)).toHaveAttribute("data-checked", "")
  await expect(ratingItems.nth(4)).toHaveAttribute("aria-checked", "false")
  await expect(ratingInput).toHaveAttribute("type", "text")
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
  await expect(tooltipContent).toHaveAttribute("data-naos-presence", "closed")
  await expect(tooltipContent).toBeHidden()
  await expect(hoverCardTrigger).toHaveAttribute("data-state", "closed")
  await expect(hoverCardContent).toHaveAttribute("data-scope", "hover-card")
  await expect(hoverCardContent).toHaveAttribute("data-naos-presence", "closed")
  await expect(hoverCardContent).toBeHidden()
  await expect(progressRoot).toHaveAttribute("data-state", "loading")
  await expect(progressRoot).toHaveAttribute("data-value", "80")
  await expect(progressTrack).toHaveAttribute("role", "progressbar")
  await expect(progressTrack).toHaveAttribute("aria-valuenow", "80")
  await expect(progressRange).toHaveAttribute("style", /width:\s*80%/)
  await expect(progressValue).toHaveText("Release progress: 80%")
  await expect(avatarRoot).toHaveAttribute("data-state", "loaded")
  await expect(avatarImage).toHaveAttribute("alt", "Operations")
  await expect(avatarImage).toBeVisible()
  await expect(avatarFallback).toBeHidden()
  await expect(toastTrigger).toHaveAttribute("data-type", "success")
  await expect(toastRegion).toHaveAttribute("role", "region")
  await expect(toastRegion).toHaveAttribute("data-count", "0")
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

  await tagsInputField.fill("qa")
  await tagsInputField.press("Enter")
  await expect(tagsInputRoot).toHaveAttribute("data-value", "docs,preview,qa")
  await expect(tagItems).toHaveCount(3)
  await expect(page.locator("#primitive-event")).toContainText(
    '"valueAsString":"docs,preview,qa"'
  )
  await tagDeleteTriggers.nth(1).click()
  await expect(tagsInputRoot).toHaveAttribute("data-value", "docs,qa")
  await expect(tagItems).toHaveCount(2)

  await fileUploadInput.setInputFiles({
    name: "release.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("release notes"),
  })
  await expect(fileUploadRoot).toHaveAttribute("data-state", "filled")
  await expect(fileUploadRoot).toHaveAttribute("data-value", "release.txt")
  await expect(fileUploadItems).toHaveCount(1)
  await expect(fileUploadItems.nth(0)).toContainText("release.txt")
  await expect(page.locator("#primitive-event")).toContainText(
    '"files":["release.txt"]'
  )

  await datePickerTrigger.click()
  await expect(datePickerRoot).toHaveAttribute("data-state", "open")
  await expect(datePickerContent).toBeVisible()
  await expect(page.locator("#primitive-event")).toContainText('"open":true')
  await datePickerTable.focus()
  await datePickerTable.press("ArrowRight")
  await datePickerTable.press("Enter")
  await expect(datePickerRoot).toHaveAttribute("data-value", "2026-06-19")
  await expectPrimitiveEvent(page, "naos-change", { value: "2026-06-19" })
  await datePickerTrigger.click()
  await datePicker.locator("[part~='cell-trigger'][data-value='2026-06-20']").click()
  await expect(datePickerRoot).toHaveAttribute("data-value", "2026-06-20")
  await expectPrimitiveEvent(page, "naos-change", { value: "2026-06-20" })

  await editableEdit.click()
  await expect(editableRoot).toHaveAttribute("data-state", "edit")
  await expect(editableInput).toBeVisible()
  await editableInput.fill("Launch approved")
  await expect(editableRoot).toHaveAttribute("data-value", "Launch approved")
  await expectPrimitiveEvent(page, "naos-change", { value: "Launch approved" })
  await editableSubmit.click()
  await expect(editableRoot).toHaveAttribute("data-state", "preview")
  await expect(editablePreview).toContainText("Launch approved")
  await expectPrimitiveEvent(page, "naos-submit", { value: "Launch approved" })

  await ratingItems.nth(3).click()
  await expect(ratingRoot).toHaveAttribute("data-value", "4")
  await expect(ratingItems.nth(3)).toHaveAttribute("data-checked", "")
  await expect(page.locator("#primitive-event")).toContainText('"value":4')
  await expect(ratingItems.nth(3)).toBeFocused()
  await ratingItems.nth(3).press("ArrowLeft")
  await expect(ratingRoot).toHaveAttribute("data-value", "3")
  await expect(ratingItems.nth(2)).toHaveAttribute("data-checked", "")
  await expect(ratingItems.nth(2)).toBeFocused()

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
  await sliderControl.click({
    position: {
      x: sliderBox.width * 0.8,
      y: sliderBox.height / 2,
    },
  })
  await expect(sliderThumb).toHaveAttribute("aria-valuenow", "80")

  await form.locator("button[type='submit']").click()
  await expect(page.locator("body")).toHaveAttribute(
    "data-last-primitive-form",
    "docs:reviewed, preview:enabled, notify:enabled, audience:stable, channels:docs, cadence:monthly, region:apac, lane:audit, owner:docs, approvals:3, release-code:1234, release-tags:docs,qa, release-file:release.txt, release-date:2026-06-20, release-note:Launch approved, release-rating:3, confidence:80"
  )
  await expect(page.locator("#primitive-form-event")).toHaveText(
    "Last primitive form data: docs:reviewed, preview:enabled, notify:enabled, audience:stable, channels:docs, cadence:monthly, region:apac, lane:audit, owner:docs, approvals:3, release-code:1234, release-tags:docs,qa, release-file:release.txt, release-date:2026-06-20, release-note:Launch approved, release-rating:3, confidence:80"
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
  await expect(tagsInputRoot).toHaveAttribute("data-value", "docs,preview")
  await expect(tagItems).toHaveCount(2)
  await expect(fileUploadRoot).toHaveAttribute("data-state", "empty")
  await expect(fileUploadItems).toHaveCount(0)
  await expect(datePickerRoot).toHaveAttribute("data-value", "2026-06-18")
  await expect(datePickerInput).toHaveValue("06/18/2026")
  await expect(editableRoot).toHaveAttribute("data-value", "Launch checklist")
  await expect(editablePreview).toContainText("Launch checklist")
  await expect(ratingRoot).toHaveAttribute("data-value", "3")
  await expect(ratingItems.nth(2)).toHaveAttribute("data-checked", "")
  await expect(sliderThumb).toHaveAttribute("aria-valuenow", "40")
  await expect(page.locator("body")).toHaveAttribute(
    "data-last-primitive-form",
    "notify:enabled, channels:web, cadence:weekly, region:eu, lane:review, owner:ops, approvals:2, release-code:123, release-tags:docs,preview, release-date:2026-06-18, release-note:Launch checklist, release-rating:3, confidence:40"
  )

  await fileUploadInput.setInputFiles({
    name: "cleanup.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("cleanup"),
  })
  await expect(fileUploadRoot).toHaveAttribute("data-value", "cleanup.txt")
  await fileUploadClear.click()
  await expect(fileUploadRoot).toHaveAttribute("data-state", "empty")
  await expect(fileUploadItems).toHaveCount(0)

  await combobox.evaluate((element) => {
    const item = document.createElement("naos-combobox-item")
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
    const item = document.createElement("naos-select-item")
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
    const item = document.createElement("naos-listbox-item")
    item.setAttribute("value", "hotfix")
    item.setAttribute("label", "Hotfix")
    element.append(item)
  })
  await expect(listboxItems).toHaveCount(5)
  await listboxItems.nth(4).click()
  await expect(listboxItems.nth(4)).toHaveAttribute("data-state", "checked")
  await expect(page.locator("#primitive-event")).toContainText('"value":["hotfix"]')

  await segmentedControl.evaluate((element) => {
    const item = document.createElement("naos-segmented-item")
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
    const disabledTab = document.createElement("naos-tab")
    disabledTab.setAttribute("value", "audit")
    disabledTab.setAttribute("label", "Audit")
    disabledTab.setAttribute("disabled", "")
    const disabledPanel = document.createElement("naos-tab-panel")
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
    const tab = document.createElement("naos-tab")
    tab.setAttribute("value", "metrics")
    tab.setAttribute("label", "Metrics")
    const panel = document.createElement("naos-tab-panel")
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
    const item = document.createElement("naos-menu-item")
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
    const collapsible = document.createElement("naos-collapsible")
    collapsible.setAttribute("label", "Disabled notes")
    collapsible.setAttribute("disabled", "")
    document.querySelector("#primitive-package-case .primitive-stack")?.append(collapsible)
  })
  const disabledCollapsible = section.locator("naos-collapsible").nth(1)
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
    const item = document.createElement("naos-accordion-item")
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
  await expect(tooltipContent).toHaveAttribute("data-naos-presence", "open")
  await tooltipContent.evaluate((content) => {
    (content as HTMLElement).style.setProperty(
      "--naos-tooltip-motion-duration",
      "250ms"
    )
  })
  await expect(page.locator("#primitive-event")).toContainText('"open":true')
  await observePresenceAttributes(tooltipContent, "tooltip")
  await page.keyboard.press("Escape")
  await expect(tooltipContent).toBeHidden()
  await expect(tooltipContent).toHaveAttribute("data-naos-presence", "closed")
  await expectObservedClosingPresence(page, "tooltip")
  await expect(page.locator("#primitive-event")).toContainText('"open":false')

  await tooltipTrigger.evaluate((trigger) => {
    trigger.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true,
      pointerType: "mouse",
    }))
  })
  await expect(tooltipContent).toBeVisible()
  await expect(tooltipContent).toHaveAttribute("data-naos-presence", "open")
  await tooltipTrigger.evaluate((trigger) => {
    trigger.dispatchEvent(new PointerEvent("pointerleave", {
      bubbles: true,
      pointerType: "mouse",
    }))
  })
  await expect(tooltipContent).toBeHidden()
  await expect(tooltipContent).toHaveAttribute("data-naos-presence", "closed")

  await hoverCardTrigger.evaluate((trigger) => {
    trigger.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true,
      pointerType: "mouse",
    }))
  })
  await expect(hoverCardTrigger).toHaveAttribute("data-state", "open")
  await expect(hoverCardContent).toBeVisible()
  await expect(hoverCardContent).toHaveAttribute("data-naos-presence", "open")
  await hoverCardContent.evaluate((content) => {
    (content as HTMLElement).style.setProperty(
      "--naos-hover-card-motion-duration",
      "250ms"
    )
  })
  await expect(page.locator("#primitive-event")).toContainText('"open":true')
  await observePresenceAttributes(hoverCardContent, "hover-card")
  await page.keyboard.press("Escape")
  await expect(hoverCardContent).toBeHidden()
  await expect(hoverCardContent).toHaveAttribute("data-naos-presence", "closed")
  await expectObservedClosingPresence(page, "hover-card")
  await expect(page.locator("#primitive-event")).toContainText('"open":false')

  await hoverCardTrigger.evaluate((trigger) => {
    trigger.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true,
      pointerType: "mouse",
    }))
  })
  await expect(hoverCardContent).toBeVisible()
  await expect(hoverCardContent).toHaveAttribute("data-naos-presence", "open")
  await hoverCardContent.evaluate((content) => {
    content.dispatchEvent(new PointerEvent("pointerleave", {
      bubbles: true,
      pointerType: "mouse",
    }))
  })
  await expect(hoverCardContent).toBeHidden()
  await expect(hoverCardContent).toHaveAttribute("data-naos-presence", "closed")

  await toastTrigger.click()
  await expectPrimitiveEventType(page, "naos-create")
  await expect(toastRegion).toHaveAttribute("data-count", "1")
  await expect(toastItems).toHaveCount(1)
  await expect(toastItems.nth(0)).toHaveAttribute("data-type", "success")
  await expect(toastItems.nth(0).locator("[part~='title']")).toHaveText(
    "Release queued"
  )
  await expect(toastItems.nth(0).locator("[part~='description']")).toContainText(
    "managed by the Zag toast store"
  )
  await toastItems.nth(0).locator("[part~='close']").click()
  await expect(toastRegion).toHaveAttribute("data-count", "0")
})

test("form-associated primitive controls receive disabled fieldset state", async ({
  page,
}) => {
  await page.goto("/")

  await page.evaluate(() => {
    const form = document.createElement("form")
    form.innerHTML = `
      <fieldset disabled>
        <naos-checkbox name="blocked" value="yes" label="Blocked"></naos-checkbox>
        <naos-toggle name="blocked-toggle" value="yes" label="Blocked toggle"></naos-toggle>
        <naos-switch name="blocked-switch" value="yes" label="Blocked switch"></naos-switch>
        <naos-radio-group name="blocked-radio" label="Blocked radio">
          <naos-radio value="yes" label="Yes"></naos-radio>
        </naos-radio-group>
        <naos-toggle-group name="blocked-toggle-group" label="Blocked toggles" multiple>
          <naos-toggle-item value="yes" label="Yes"></naos-toggle-item>
        </naos-toggle-group>
        <naos-segmented-control name="blocked-segmented" label="Blocked segmented">
          <naos-segmented-item value="yes" label="Yes"></naos-segmented-item>
        </naos-segmented-control>
        <naos-select name="blocked-select" label="Blocked select">
          <naos-select-item value="yes" label="Yes"></naos-select-item>
        </naos-select>
        <naos-listbox name="blocked-listbox" label="Blocked listbox">
          <naos-listbox-item value="yes" label="Yes"></naos-listbox-item>
        </naos-listbox>
        <naos-combobox name="blocked-combobox" label="Blocked combobox">
          <naos-combobox-item value="yes" label="Yes"></naos-combobox-item>
        </naos-combobox>
        <naos-number-input name="blocked-number" label="Blocked number" value="2"></naos-number-input>
        <naos-pin-input name="blocked-pin" label="Blocked pin" value="12"></naos-pin-input>
        <naos-tags-input name="blocked-tags" label="Blocked tags" value="docs,preview"></naos-tags-input>
        <naos-file-upload name="blocked-file" label="Blocked file"></naos-file-upload>
        <naos-date-picker name="blocked-date" label="Blocked date" value="2026-06-18"></naos-date-picker>
        <naos-editable name="blocked-note" label="Blocked note" value="Blocked note"></naos-editable>
        <naos-rating-group name="blocked-rating" label="Blocked rating" value="3"></naos-rating-group>
        <naos-slider name="blocked-slider" label="Blocked slider" value="40"></naos-slider>
      </fieldset>
    `
    document.body.append(form)
  })

  const checkboxButton = page.locator("form fieldset naos-checkbox button")
  const radio = page.locator("form fieldset naos-radio")
  const toggleButton = page.locator("form fieldset naos-toggle button")
  const switchInput = page.locator("form fieldset naos-switch input")
  const toggleItem = page.locator("form fieldset naos-toggle-item")
  const segmentedItem = page.locator("form fieldset naos-segmented-item")
  const selectButton = page.locator("form fieldset naos-select button")
  const selectItem = page.locator("form fieldset naos-select-item")
  const listboxItem = page.locator("form fieldset naos-listbox-item")
  const comboboxInput = page.locator("form fieldset naos-combobox input")
  const comboboxButton = page.locator("form fieldset naos-combobox button")
  const comboboxItem = page.locator("form fieldset naos-combobox-item")
  const numberInput = page.locator("form fieldset naos-number-input input")
  const numberIncrement = page.locator("form fieldset naos-number-input [part~='increment']")
  const pinInputField = page.locator("form fieldset naos-pin-input [part~='input']").first()
  const tagsInputField = page.locator("form fieldset naos-tags-input [part~='input']")
  const fileUploadInput = page.locator("form fieldset naos-file-upload [part~='input']")
  const fileUploadTrigger = page.locator("form fieldset naos-file-upload [part~='trigger']")
  const datePickerInput = page.locator("form fieldset naos-date-picker [part~='input']")
  const datePickerTrigger = page.locator("form fieldset naos-date-picker [part~='trigger']")
  const editableInput = page.locator("form fieldset naos-editable [part~='input']")
  const editableEdit = page.locator("form fieldset naos-editable [part~='edit']")
  const ratingRoot = page.locator("form fieldset naos-rating-group [part~='root']")
  const ratingItem = page.locator("form fieldset naos-rating-group [part~='item']").nth(3)
  const sliderThumb = page.locator("form fieldset naos-slider [part~='thumb']")

  await expect(checkboxButton).toBeDisabled()
  await expect(toggleButton).toBeDisabled()
  await expect(switchInput).toBeDisabled()
  await expect(selectButton).toBeDisabled()
  await expect(comboboxInput).toBeDisabled()
  await expect(comboboxButton).toBeDisabled()
  await expect(numberInput).toBeDisabled()
  await expect(numberIncrement).toBeDisabled()
  await expect(pinInputField).toBeDisabled()
  await expect(tagsInputField).toBeDisabled()
  await expect(fileUploadInput).toBeDisabled()
  await expect(fileUploadTrigger).toBeDisabled()
  await expect(datePickerInput).toBeDisabled()
  await expect(datePickerTrigger).toBeDisabled()
  await expect(editableInput).toBeDisabled()
  await expect(editableEdit).toBeDisabled()
  await expect(ratingItem).toHaveAttribute("aria-disabled", "true")
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
  await ratingItem.evaluate((item) =>
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
  await expect(ratingRoot).toHaveAttribute("data-value", "3")
  await expect(ratingItem).toHaveAttribute("aria-checked", "false")
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
        Boolean(element.shadowRoot?.querySelector("[data-naos-root]")) &&
        Boolean(element.shadowRoot?.querySelector("[data-naos-text='text0']"))
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
        __naosUpgrade(): Promise<unknown>
      }
    ).__naosUpgrade()
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
      ?.querySelector("[data-naos-node='node0']")
      ?.removeAttribute("data-naos-node")
  })

  await page.evaluate(() =>
    (
      window as unknown as Window & {
        __naosUpgrade(): Promise<unknown>
      }
    )
      .__naosUpgrade()
      .catch(() => undefined)
  )

  await expect
    .poll(() => pageErrors.some((message) => message.includes("Naos hydration mismatch")))
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
      ?.querySelector("[data-naos-node='node0']")
      ?.removeAttribute("data-naos-node")
  })

  await page.evaluate(async () => {
    const response = await fetch("/src/counter.wc.tsx")
    let code = await response.text()
    code = code.replace("return import.meta.env?.DEV ?? true;", "return false;")
    code = code.replaceAll(
      "/src/counter.wc.css?inline",
      "data:text/javascript,export default %22%22"
    )
    code = code.replace(
      /from "([^"]*packages\/runtime\/dist\/runtime\.mjs)";/,
      (_match, specifier: string) =>
        `from ${JSON.stringify(new URL(specifier, window.location.href).href)};`
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
      Boolean(element.shadowRoot?.querySelector("[data-naos-root]"))
    )
  ).resolves.toBe(false)

  await counterButton.click()
  await expect(counterButton).toHaveText("Count: 1")
})
