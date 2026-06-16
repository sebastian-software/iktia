import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
  entries: ["./src/runtime"],
  declaration: true,
  failOnWarn: false,
  rollup: {
    emitCJS: true,
  },
})
