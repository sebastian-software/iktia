import "./demo.css"
import "./counter.wc.tsx"
import "./toolbar.wc.tsx"
import "./toggle.wc.tsx"

const counterEvent = document.querySelector("#counter-event")
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
