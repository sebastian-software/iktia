import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
  entries: ["./src/index", "./src/jsx-runtime", "./src/jsx-dev-runtime"],
  declaration: true,
  failOnWarn: false,
  rollup: {
    emitCJS: true,
  },
})
