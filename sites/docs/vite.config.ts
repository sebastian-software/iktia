import { defineConfig } from "vite"
import tailwindcss from "@tailwindcss/vite"
import { ardo, detectGitHubBasename } from "ardo/vite"

function docsBasePath(): string {
  if (process.env.NAOS_SITE_BASE) {
    return process.env.NAOS_SITE_BASE
  }

  return process.env.NAOS_GITHUB_PAGES === "true" ? detectGitHubBasename() : "/"
}

export default defineConfig({
  base: docsBasePath(),
  plugins: [
    tailwindcss(),
    ardo({
      base: docsBasePath(),
      title: "Naos",
      description:
        "React-like TSX authoring for native Custom Elements without a framework runtime.",
      githubPages: process.env.NAOS_GITHUB_PAGES === "true",
      markdown: {
        lineNumbers: true,
      },
      project: {
        name: "Naos",
        repository: "https://github.com/sebastian-software/naos-ui",
        license: "Apache-2.0",
      },
      sidebar: {
        sectionOrder: ["guide", "reference"],
      },
    }),
  ],
})
