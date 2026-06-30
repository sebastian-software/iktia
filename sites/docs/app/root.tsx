import { ArdoRoot, ArdoRootLayout } from "ardo/ui"
import type { MetaFunction } from "react-router"
import config from "virtual:ardo/config"
import sidebar from "virtual:ardo/sidebar"
import "./app.css"
import "ardo/ui/styles.css"

export const meta: MetaFunction = () => [
  { title: config.title },
  {
    name: "description",
    content:
      "Naos documentation for React-like TSX authoring and native Custom Element output.",
  },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return <ArdoRootLayout>{children}</ArdoRootLayout>
}

export default function Root() {
  return <ArdoRoot config={config} sidebar={sidebar} />
}
