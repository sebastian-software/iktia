import "./demo.css"
import "./counter.wc.tsx"
import "./disclosure.wc.tsx"
import "./field.wc.tsx"
import "./toolbar.wc.tsx"
import "./toggle.wc.tsx"

const counterEvent = document.querySelector("#counter-event")
const disclosureEvent = document.querySelector("#disclosure-event")
const fieldEvent = document.querySelector("#field-event")
const toggleEvent = document.querySelector("#toggle-event")

document.addEventListener("change", (event) => {
  if (event instanceof CustomEvent) {
    const value = String(event.detail)
    document.body.dataset.lastChange = value
    if (counterEvent) {
      counterEvent.textContent = `Last counter event: ${value}`
    }
  }
})

document.addEventListener("toggle-change", (event) => {
  if (event instanceof CustomEvent) {
    const value = String(event.detail)
    document.body.dataset.lastToggle = value
    if (toggleEvent) {
      toggleEvent.textContent = `Last toggle event: ${value}`
    }
  }
})

document.addEventListener("disclosure-change", (event) => {
  if (event instanceof CustomEvent) {
    const value = String(event.detail)
    document.body.dataset.lastDisclosure = value
    if (disclosureEvent) {
      disclosureEvent.textContent = `Last disclosure event: ${value}`
    }
  }
})

document.addEventListener("field-change", (event) => {
  if (event instanceof CustomEvent) {
    const value = String(event.detail)
    document.body.dataset.lastField = value
    if (fieldEvent) {
      fieldEvent.textContent = `Last field event: ${value}`
    }
  }
})
