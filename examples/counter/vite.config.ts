import { defineConfig } from "vite"
import { leanWebComponents } from "lean-wc/vite"

export default defineConfig({
  plugins: [leanWebComponents()],
})

