import "./counter.wc.tsx"
import "./toggle.wc.tsx"

document.querySelector("x-counter")?.addEventListener("change", (event) => {
  if (event instanceof CustomEvent) {
    document.body.dataset.lastChange = String(event.detail)
  }
})

document.querySelector("x-toggle")?.addEventListener("toggle-change", (event) => {
  if (event instanceof CustomEvent) {
    document.body.dataset.lastToggle = String(event.detail)
  }
})
