import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
  entries: ["./src/vite"],
  declaration: true,
  failOnWarn: false,
  rollup: {
    emitCJS: true,
  },
})
