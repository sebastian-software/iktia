import "./demo.css"
import "@iktia/primitives"
import { createRouter, defineRoutes, type IktiaRouteMatch } from "@iktia/router"
import "./counter.wc.tsx"
import "./disclosure.wc.tsx"
import "./field.wc.tsx"
import "./list-reconciler-probe.wc.tsx"
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
const routerEvent = document.querySelector("#router-event")
const routerOutlet = document.querySelector("#router-outlet")
const routerSection = document.querySelector("#router-case")

class RouterHomeView extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <article class="router-view" data-view="home">
        <p class="case-kicker">Router view</p>
        <h3>Router home</h3>
        <p>Mounted from a plain Custom Element route target.</p>
      </article>
    `
  }
}

class RouterProductView extends HTMLElement {
  productId = ""

  connectedCallback() {
    const route = this.iktiaRoute
    this.productId = this.productId || route?.params.id || ""
    this.innerHTML = `
      <article class="router-view" data-view="product">
        <p class="case-kicker">Route params</p>
        <h3>Product ${this.productId}</h3>
        <p>Search tab: ${route?.search.get("tab") ?? "none"}</p>
      </article>
    `
  }
}

class RouterSettingsView extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <article class="router-view" data-view="settings">
        <p class="case-kicker">Settings</p>
        <h3>Router settings</h3>
        <p>This view was lazy-loaded before mount.</p>
      </article>
    `
  }
}

class RouterNotFoundView extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <article class="router-view" data-view="not-found">
        <p class="case-kicker">Not found</p>
        <h3>Route not found</h3>
        <p>The router kept the app shell alive and mounted the fallback view.</p>
      </article>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "router-home-view": RouterHomeView
    "router-not-found-view": RouterNotFoundView
    "router-product-view": RouterProductView
    "router-settings-view": RouterSettingsView
  }

  interface HTMLElement {
    iktiaRoute?: IktiaRouteMatch
  }
}

if (!customElements.get("router-home-view")) {
  customElements.define("router-home-view", RouterHomeView)
}
if (!customElements.get("router-product-view")) {
  customElements.define("router-product-view", RouterProductView)
}
if (!customElements.get("router-settings-view")) {
  customElements.define("router-settings-view", RouterSettingsView)
}
if (!customElements.get("router-not-found-view")) {
  customElements.define("router-not-found-view", RouterNotFoundView)
}

if (routerOutlet && routerSection) {
  const routes = defineRoutes([
    {
      path: "/",
      tag: "router-home-view",
      title: "Iktia demos",
    },
    {
      path: "/products/:id",
      tag: "router-product-view",
      load: async () => Promise.resolve(),
      props({ params }) {
        return { productId: params.id }
      },
      attrs({ params }) {
        return { "data-product-id": params.id ?? null }
      },
      title({ params }) {
        return `Product ${params.id} - Iktia demos`
      },
    },
    {
      path: "/settings",
      tag: "router-settings-view",
      load: async () => Promise.resolve(),
    },
  ] as const)

  const router = createRouter({
    basePath: import.meta.env.BASE_URL,
    linkRoot: routerSection,
    outlet: routerOutlet,
    routes,
    notFound: {
      tag: "router-not-found-view",
    },
  })

  for (const anchor of routerSection.querySelectorAll<HTMLAnchorElement>("[data-router-to]")) {
    const routePath = anchor.dataset.routerTo
    if (!routePath) continue
    if (routePath === "/products/:id") {
      anchor.href = router.href(routePath, { id: "42" }, {
        search: { tab: "details" },
      })
    } else {
      anchor.href = router.href(routePath as "/" | "/settings")
    }
  }

  router.addEventListener("iktia:routechange", (event) => {
    if (event instanceof CustomEvent) {
      const detail = event.detail as { match: IktiaRouteMatch }
      const value = detail.match.url.pathname + detail.match.url.search
      document.body.dataset.lastRouterRoute = value
      if (routerEvent) {
        routerEvent.textContent = `Last router route: ${value}`
      }
    }
  })

  router.start()
}

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
