#![warn(missing_docs, rustdoc::broken_intra_doc_links)]
//! Rust compiler core for lean-wc.
//!
//! The core owns host-neutral compiler semantics. TypeScript packages call into
//! this crate through a thin Node binding and keep bundler integration outside
//! the semantic pipeline.

mod codegen;
mod error;
mod model;
mod parse;

pub use codegen::transform_component_module;
pub use error::{CompilerError, CompilerResult};
pub use model::{
    ComponentModule, ComponentOptions, EventDefinition, PropDefinition, PropKind, StateDefinition,
    TransformResult,
};
pub use parse::analyze_component_module;

/// Returns version metadata for the loaded compiler core.
#[must_use]
pub fn core_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    use super::{analyze_component_module, core_version, transform_component_module};

    #[test]
    fn core_version_should_match_crate_version() {
        assert_eq!(core_version(), env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn analyze_component_module_should_extract_counter_model() {
        let source = r#"
            import { component, event, prop, state } from "lean-wc";

            export default component("x-counter", { shadow: true }, () => {
              const label = prop.string("label", "Count");
              const count = state(0);
              const change = event<number>("change");

              return (
                <button onClick={() => change.emit(count())}>
                  {label()}: {count()}
                </button>
              );
            });
        "#;

        let module = match analyze_component_module(source, "counter.wc.tsx") {
            Ok(module) => module,
            Err(error) => panic!("analysis failed: {error}"),
        };

        assert_eq!(module.tag_name, "x-counter");
        assert!(module.options.shadow);
        assert_eq!(module.props.len(), 1);
        assert_eq!(module.states.len(), 1);
        assert_eq!(module.events.len(), 1);
        assert!(module.template_source.contains("<button"));
    }

    #[test]
    fn transform_component_module_should_generate_custom_element() {
        let source = r#"
            import { component, event, prop, state } from "lean-wc";

            export default component("x-counter", { shadow: true }, () => {
              const label = prop.string("label", "Count");
              const count = state(0);
              const change = event<number>("change");

              return (
                <button
                  part="button"
                  data-count={count()}
                  onClick={() => {
                    count.set(count() + 1);
                    change.emit(count());
                  }}
                >
                  {label()}: {count()}
                </button>
              );
            });
        "#;

        let result = match transform_component_module(source, "counter.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.has_changed);
        assert!(result.code.contains("class XCounter extends HTMLElement"));
        assert!(
            result
                .code
                .contains("customElements.define(\"x-counter\", XCounter)")
        );
        assert!(result.code.contains("new CustomEvent(\"change\""));
        assert!(result.code.contains("this.#text0.data"));
    }

    #[test]
    fn transform_component_module_should_generate_slots_and_shadow_styles() {
        let source = r#"
            import { component } from "lean-wc";

            export default component("x-button", {
              shadow: true,
              styles: [":host { display: inline-block; }", "button { color: red; }"],
            }, () => {
              return (
                <button part="button">
                  <slot name="icon" />
                  <slot />
                </button>
              );
            });
        "#;

        let result = match transform_component_module(source, "button.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.code.contains("style.textContent"));
        assert!(result.code.contains("document.createElement(\"slot\")"));
        assert!(result.code.contains("setAttribute(\"name\", \"icon\")"));
        assert!(result.code.contains("setAttribute(\"part\", \"button\")"));
    }
}
