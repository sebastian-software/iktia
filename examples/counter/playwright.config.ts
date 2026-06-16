import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:4175",
  },
  webServer: {
    command: "pnpm vite --host 127.0.0.1 --port 4175",
    reuseExistingServer: true,
    url: "http://127.0.0.1:4175",
  },
})

