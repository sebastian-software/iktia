import type { Config } from "@react-router/dev/config"
import { detectGitHubBasename } from "ardo/vite"

export default {
  basename:
    process.env.NAOS_SITE_BASE ??
    (process.env.NAOS_GITHUB_PAGES === "true" ? detectGitHubBasename() : "/"),
  prerender: true,
  ssr: false,
} satisfies Config
