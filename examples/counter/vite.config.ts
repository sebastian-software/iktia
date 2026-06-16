import { defineConfig } from "vite"
import { leanWebComponents } from "lean-wc/vite"

function demoBasePath(): string {
  if (process.env.LEAN_WC_GITHUB_PAGES !== "true") {
    return "/"
  }

  const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1]
  return repositoryName ? `/${repositoryName}/` : "/"
}

export default defineConfig({
  base: demoBasePath(),
  plugins: [leanWebComponents()],
})
