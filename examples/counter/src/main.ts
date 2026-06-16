import "./counter.wc.tsx"

document.querySelector("x-counter")?.addEventListener("change", (event) => {
  if (event instanceof CustomEvent) {
    document.body.dataset.lastChange = String(event.detail)
  }
})

