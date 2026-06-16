#![warn(missing_docs, rustdoc::broken_intra_doc_links)]
//! Rust compiler core for lean-wc.
//!
//! The core owns host-neutral compiler semantics. TypeScript packages call into
//! this crate through a thin Node binding and keep bundler integration outside
//! the semantic pipeline.

mod codegen;
mod error;
mod model;
mod naming;
mod parse;

pub use codegen::transform_component_module;
pub use error::{CompilerError, CompilerResult};
pub use model::{
    ComponentImport, ComponentModule, ComponentOptions, ComputedDefinition, EffectDefinition,
    EventDefinition, PropAccess, PropDefinition, PropKind, StateDefinition, StateKind,
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
    use super::{StateKind, analyze_component_module, core_version, transform_component_module};

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
        assert_eq!(module.states[0].kind, StateKind::State);
        assert_eq!(module.events.len(), 1);
        assert!(module.template_source.contains("<button"));
    }

    #[test]
    fn analyze_component_module_should_extract_function_component_model() {
        let source = r#"
            import { event, state, type ComponentOptions } from "lean-wc";

            export const options = {
              shadow: true,
              styles: [":host { display: block; }"],
            } satisfies ComponentOptions;

            export function Counter({ label = "Count", enabled = true, step = 1 }: CounterProps = {}) {
              const count = signal(0);
              const doubled = computed(() => count() * 2);
              effect(() => {
                console.log(doubled());
                return () => console.log("cleanup");
              });
              const change = event<number>("change");

              return (
                <button disabled={!enabled} onClick={() => change.emit(count())}>
                  {label}: {doubled()}
                </button>
              );
            }
        "#;

        let module = match analyze_component_module(source, "counter.wc.tsx") {
            Ok(module) => module,
            Err(error) => panic!("analysis failed: {error}"),
        };

        assert_eq!(module.tag_name, "x-counter");
        assert_eq!(module.class_name, "CounterElement");
        assert_eq!(module.export_name.as_deref(), Some("Counter"));
        assert_eq!(module.props.len(), 3);
        assert_eq!(module.props[0].prop_name, "label");
        assert_eq!(module.props[1].attribute_name, "enabled");
        assert_eq!(module.props[2].attribute_name, "step");
        assert_eq!(module.states[0].kind, StateKind::Signal);
        assert_eq!(module.computed.len(), 1);
        assert_eq!(module.computed[0].local_name, "doubled");
        assert_eq!(module.effects.len(), 1);
        assert_eq!(module.options.styles, vec!["\":host { display: block; }\""]);
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
    fn transform_component_module_should_generate_function_component_element() {
        let source = r#"
            import { event, state } from "lean-wc";

            export function Counter({ label = "Count" }: CounterProps = {}) {
              const count = state(0);
              const change = event<number>("change");

              return (
                <button
                  part="button"
                  onClick={() => {
                    count.set(count() + 1);
                    change.emit(count());
                  }}
                >
                  {label}: {count()}
                </button>
              );
            }
        "#;

        let result = match transform_component_module(source, "counter.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(
            result
                .code
                .contains("class CounterElement extends HTMLElement")
        );
        assert!(
            result
                .code
                .contains("customElements.define(\"x-counter\", CounterElement)")
        );
        assert!(result.code.contains("const label = this.#props.label;"));
        assert!(
            result
                .code
                .contains("export { CounterElement as Counter };")
        );
    }

    #[test]
    fn transform_component_module_should_generate_signals_computed_and_effects() {
        let source = r#"
            import { computed, effect, event, signal } from "lean-wc";

            export function Counter({ label = "Count" }: CounterProps = {}) {
              const count = signal(0);
              const doubled = computed(() => count() * 2);
              const change = event<number>("change");

              effect(() => {
                document.body.dataset.lastEffect = String(doubled());
                return () => {
                  document.body.dataset.cleaned = "true";
                };
              });

              return (
                <button
                  data-count={doubled()}
                  onClick={() => {
                    count.update((value) => value + 1);
                    change.emit(doubled());
                  }}
                >
                  {label}: {doubled()}
                </button>
              );
            }
        "#;

        let result = match transform_component_module(source, "counter.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.code.contains("#effectCleanups = [];"));
        assert!(result.code.contains("const doubled = () => (count() * 2);"));
        assert!(result.code.contains("#runEffects()"));
        assert!(result.code.contains("document.body.dataset.lastEffect"));
        assert!(result.code.contains("this.#flush();"));
    }

    #[test]
    fn transform_component_module_should_generate_control_flow_and_web_composition_helpers() {
        let source = r#"
            import { For, Show, computed, effect, event, host, on, signal } from "lean-wc";

            export function ToggleList({ visible = true }: ToggleListProps = {}) {
              const pressed = signal(false);
              const items = computed(() => pressed() ? ["On"] : ["Off"]);
              const toggled = event<boolean>("toggle-change");

              effect(() => {
                const { element, signal } = host();
                element.dataset.effect = signal.aborted ? "off" : "on";
                return () => {
                  delete element.dataset.effect;
                };
              });

              return (
                <button
                  part="root control"
                  data-state={pressed() ? "on" : "off"}
                  aria-pressed={pressed()}
                  onClick={on("click", () => {
                    pressed.update((value) => !value);
                    toggled.emit(pressed());
                  })}
                >
                  <Show when={visible} fallback={<span part="label">Hidden</span>}>
                    <span part="label">Visible</span>
                  </Show>
                  <For each={items()}>
                    {(item, index) => (
                      <span part="indicator" data-index={index}>
                        {item}
                      </span>
                    )}
                  </For>
                </button>
              );
            }
        "#;

        let result = match transform_component_module(source, "toggle-list.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.code.contains("data-lean-control\", \"show"));
        assert!(result.code.contains("data-lean-control\", \"for"));
        assert!(result.code.contains(".replaceChildren("));
        assert!(result.code.contains("addEventListener(\"click\""));
        assert!(!result.code.contains("on(\"click\""));
        assert!(
            result
                .code
                .contains("#abortController = new AbortController();")
        );
        assert!(result.code.contains("const host = () => ({"));
        assert!(result.code.contains("this.#abortController.abort();"));
    }

    #[test]
    fn transform_component_module_should_rewrite_nested_pascal_components() {
        let source = r#"
            import { Counter as BaseCounter } from "./counter.wc.tsx";

            export function Dashboard() {
              return (
                <section>
                  <BaseCounter initialCount={1} onValueChange={(event) => {
                    console.log(event.detail);
                  }} />
                </section>
              );
            }
        "#;

        let result = match transform_component_module(source, "dashboard.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.code.contains("import \"./counter.wc.tsx\";"));
        assert!(
            result
                .code
                .contains("document.createElement(\"x-counter\")")
        );
        assert!(result.code.contains("initial-count"));
        assert!(result.code.contains("addEventListener(\"value-change\""));
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
