import type { MetaFunction } from "react-router"
import config from "virtual:ardo/config"

export const meta: MetaFunction = () => [
  { title: "Naos" },
  {
    name: "description",
    content:
      "React-like TSX authoring for native Custom Elements without a React runtime.",
  },
]

function withBase(path: string): string {
  const base = config.base?.replace(/\/?$/, "/") ?? "/"
  return `${base}${path.replace(/^\//, "")}`
}

export default function HomePage() {
  return (
    <main className="naos-home">
      <section className="naos-hero">
        <p className="naos-eyebrow">v0.1 prerelease docs</p>
        <h1>React-like TSX authoring. Native Custom Element output.</h1>
        <p>
          Write typed component functions. Ship platform-native Web Components
          with Shadow DOM, events, slots, and static HTML output when you
          prerender.
        </p>
        <div className="naos-actions">
          <a className="naos-action" data-primary="true" href={withBase("guide/getting-started")}>
            Get started
          </a>
          <a className="naos-action" href={withBase("reference/api")}>
            API reference
          </a>
          <a className="naos-action" href={withBase("guide/styling-and-dsd")}>
            Styling and DSD
          </a>
          <a className="naos-action" href={withBase("demos/")}>
            Static demos
          </a>
        </div>
      </section>

      <section className="naos-grid" aria-label="Naos documentation areas">
        <article className="naos-card">
          <h2>Learning path</h2>
          <p>
            Start with install and Vite setup, then move through authoring,
            styling, Declarative Shadow DOM, packages, demos, and API details.
          </p>
        </article>
        <article className="naos-card">
          <h2>Authoring</h2>
          <p>
            Use <code>state()</code>, <code>computed()</code>,{" "}
            <code>effect()</code>, typed events, explicit listeners, host
            lifecycle access, and keyed <code>.map()</code> lists.
          </p>
        </article>
        <article className="naos-card">
          <h2>Native output</h2>
          <p>
            The public result is Custom Elements with Shadow DOM, parts, slots,
            CSS custom properties, and Declarative Shadow DOM in prerendered
            HTML.
          </p>
        </article>
        <article className="naos-card">
          <h2>Small boundary</h2>
          <p>
            Vite owns the module graph. <code>@naos-ui/runtime</code> stays a tiny
            helper package for events, scheduling, and hydration support.
          </p>
        </article>
      </section>
    </main>
  )
}
