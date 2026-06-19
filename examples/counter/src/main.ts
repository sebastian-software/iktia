import "./demo.css"
import "@iktia/primitives"
import "./counter.wc.tsx"
import "./disclosure.wc.tsx"
import "./field.wc.tsx"
import "./reactivity-probe.wc.tsx"
import "./toolbar.wc.tsx"
import "./toggle.wc.tsx"

const counterEvent = document.querySelector("#counter-event")
const disclosureEvent = document.querySelector("#disclosure-event")
const fieldEvent = document.querySelector("#field-event")
const primitiveEvent = document.querySelector("#primitive-event")
const primitiveForm = document.querySelector("#primitive-form")
const primitiveFormEvent = document.querySelector("#primitive-form-event")
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

document.addEventListener("iktia-change", (event) => {
  if (event instanceof CustomEvent) {
    const value = JSON.stringify(event.detail)
    document.body.dataset.lastPrimitive = value
    if (primitiveEvent) {
      primitiveEvent.textContent = `Last primitive event: ${value}`
    }
  }
})

document.addEventListener("iktia-open-change", (event) => {
  if (event instanceof CustomEvent) {
    const value = JSON.stringify(event.detail)
    document.body.dataset.lastPrimitive = value
    if (primitiveEvent) {
      primitiveEvent.textContent = `Last primitive event: ${value}`
    }
  }
})

document.addEventListener("iktia-edit-change", (event) => {
  if (event instanceof CustomEvent) {
    const value = JSON.stringify(event.detail)
    document.body.dataset.lastPrimitive = value
    if (primitiveEvent) {
      primitiveEvent.textContent = `Last primitive event: ${value}`
    }
  }
})

document.addEventListener("iktia-submit", (event) => {
  if (event instanceof CustomEvent) {
    const value = JSON.stringify(event.detail)
    document.body.dataset.lastPrimitive = value
    if (primitiveEvent) {
      primitiveEvent.textContent = `Last primitive event: ${value}`
    }
  }
})

document.addEventListener("iktia-cancel", (event) => {
  if (event instanceof CustomEvent) {
    const value = JSON.stringify(event.detail)
    document.body.dataset.lastPrimitive = value
    if (primitiveEvent) {
      primitiveEvent.textContent = `Last primitive event: ${value}`
    }
  }
})

document.addEventListener("iktia-create", (event) => {
  if (event instanceof CustomEvent) {
    const value = JSON.stringify(event.detail)
    document.body.dataset.lastPrimitive = value
    if (primitiveEvent) {
      primitiveEvent.textContent = `Last primitive event: ${value}`
    }
  }
})

document.addEventListener("iktia-status-change", (event) => {
  if (event instanceof CustomEvent) {
    const value = JSON.stringify(event.detail)
    document.body.dataset.lastPrimitive = value
    if (primitiveEvent) {
      primitiveEvent.textContent = `Last primitive event: ${value}`
    }
  }
})

document.addEventListener("iktia-select", (event) => {
  if (event instanceof CustomEvent) {
    const value = JSON.stringify(event.detail)
    document.body.dataset.lastPrimitive = value
    if (primitiveEvent) {
      primitiveEvent.textContent = `Last primitive event: ${value}`
    }
  }
})

document.addEventListener("iktia-press", (event) => {
  if (event instanceof CustomEvent) {
    const value = JSON.stringify(event.detail)
    document.body.dataset.lastPrimitive = value
    if (primitiveEvent) {
      primitiveEvent.textContent = `Last primitive event: ${value}`
    }
  }
})

if (primitiveForm instanceof HTMLFormElement) {
  const formatEntry = ([name, entry]: [string, FormDataEntryValue]) =>
    `${name}:${entry instanceof File ? entry.name : String(entry)}`

  primitiveForm.addEventListener("submit", (event) => {
    event.preventDefault()
    const entries = [...new FormData(primitiveForm).entries()]
    const value =
      entries.length > 0
        ? entries.map(formatEntry).join(", ")
        : "none"
    document.body.dataset.lastPrimitiveForm = value
    if (primitiveFormEvent) {
      primitiveFormEvent.textContent = `Last primitive form data: ${value}`
    }
  })

  primitiveForm.addEventListener("reset", () => {
    setTimeout(() => {
      const entries = [...new FormData(primitiveForm).entries()]
      const value =
        entries.length > 0
          ? entries.map(formatEntry).join(", ")
          : "none"
      document.body.dataset.lastPrimitiveForm = value
      if (primitiveFormEvent) {
        primitiveFormEvent.textContent = `Last primitive form data: ${value}`
      }
    }, 50)
  })
}
