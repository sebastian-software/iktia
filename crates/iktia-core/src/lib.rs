#![warn(missing_docs, rustdoc::broken_intra_doc_links)]
//! Rust compiler core for Iktia.
//!
//! The core owns host-neutral compiler semantics. TypeScript packages call into
//! this crate through a thin Node binding and keep bundler integration outside
//! the semantic pipeline.

mod ast;
mod codegen;
mod error;
mod model;
mod naming;
mod parse;

pub use codegen::{
    render_declarative_shadow_dom_module, render_declarative_shadow_dom_module_with_inline_styles,
    transform_component_module,
};
pub use error::{CompilerError, CompilerResult};
pub use model::{
    CompilerDiagnostic, ComponentImport, ComponentModule, ComponentOptions, ComputedDefinition,
    DeclarativeShadowDomRenderResult, DiagnosticSeverity, DiagnosticSpan, EffectDefinition,
    EventDefinition, PropAccess, PropDefinition, PropKind, SourceMap, StateDefinition, StateKind,
    StyleImport, TransformResult,
};
pub use parse::analyze_component_module;

/// Returns version metadata for the loaded compiler core.
#[must_use]
pub fn core_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    use super::{
        StateKind, analyze_component_module, core_version, render_declarative_shadow_dom_module,
        render_declarative_shadow_dom_module_with_inline_styles, transform_component_module,
    };

    #[test]
    fn core_version_should_match_crate_version() {
        assert_eq!(core_version(), env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn analyze_component_module_should_extract_counter_model() {
        let source = r#"
            import { event, state } from "@iktia/core";

            export function Counter({ label = "Count" }: CounterProps = {}) {
              const count = state(0);
              const change = event<number>("change");

              return (
                <button onClick={() => change.emit(count())}>
                  {label}: {count()}
                </button>
              );
            }
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
            import { computed, effect, event, state, type ComponentOptions } from "@iktia/core";

            export const options = {
              styles: [":host { display: block; }"],
            } satisfies ComponentOptions;

            export function Counter({ label = "Count", enabled = true, step = 1 }: CounterProps = {}) {
              const count = state(0);
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
        assert_eq!(module.states[0].kind, StateKind::State);
        assert_eq!(module.computed.len(), 1);
        assert_eq!(module.computed[0].local_name, "doubled");
        assert_eq!(module.effects.len(), 1);
        assert_eq!(module.options.styles, vec!["\":host { display: block; }\""]);
    }

    #[test]
    fn analyze_component_module_should_reject_removed_component_api() {
        let source = r#"
            import { component } from "@iktia/core";

            export default component("x-counter", () => {
              return <button>Count</button>;
            });
        "#;

        let error = analyze_component_module(source, "counter.wc.tsx")
            .expect_err("component() should be rejected");

        assert!(error.to_string().contains("component() was removed"));
    }

    #[test]
    fn analyze_component_module_should_reject_removed_signal_api() {
        let source = r#"
            import { signal } from "@iktia/core";

            export function Counter() {
              const count = signal(0);
              return <button>{count()}</button>;
            }
        "#;

        let error = analyze_component_module(source, "counter.wc.tsx")
            .expect_err("signal() should be rejected");

        assert!(error.to_string().contains("signal() was removed"));
    }

    #[test]
    fn analyze_component_module_should_reject_removed_host_alias() {
        let source = r#"
            import { effect, useHost } from "@iktia/core";

            export function Counter() {
              effect(() => {
                useHost().update();
              });
              return <button>Count</button>;
            }
        "#;

        let error = analyze_component_module(source, "counter.wc.tsx")
            .expect_err("useHost() should be rejected");

        assert!(error.to_string().contains("useHost() was removed"));
    }

    #[test]
    fn analyze_component_module_should_reject_removed_prop_api() {
        let source = r#"
            import { prop } from "@iktia/core";

            export function Counter() {
              const label = prop.string("label", "Count");
              return <button>{label()}</button>;
            }
        "#;

        let error = analyze_component_module(source, "counter.wc.tsx")
            .expect_err("prop.*() should be rejected");

        assert!(
            error
                .to_string()
                .contains("prop.*() and prop() were removed")
        );
    }

    #[test]
    fn analyze_component_module_should_reject_public_shadow_option() {
        let source = r#"
            import { state, type ComponentOptions } from "@iktia/core";

            export const options = {
              shadow: false,
            } satisfies ComponentOptions;

            export function Counter() {
              const count = state(0);
              return <button>{count()}</button>;
            }
        "#;

        let error = analyze_component_module(source, "counter.wc.tsx")
            .expect_err("shadow should not be a public component option");

        assert!(
            error
                .to_string()
                .contains("Component options only support `styles`")
        );
    }

    #[test]
    fn analyze_component_module_should_reject_public_define_option() {
        let source = r#"
            import { state, type ComponentOptions } from "@iktia/core";

            export const options = {
              define: false,
            } satisfies ComponentOptions;

            export function Counter() {
              const count = state(0);
              return <button>{count()}</button>;
            }
        "#;

        let error = analyze_component_module(source, "counter.wc.tsx")
            .expect_err("define should not be a public component option");

        assert!(
            error
                .to_string()
                .contains("Component options only support `styles`")
        );
    }

    #[test]
    fn transform_component_module_should_generate_custom_element() {
        let source = r#"
            import { event, state } from "@iktia/core";

            export function Counter({ label = "Count" }: CounterProps = {}) {
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
                  {label}: {count()}
                </button>
              );
            }
        "#;

        let result = match transform_component_module(source, "counter.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.has_changed);
        let source_map = result.map.as_ref().expect("source map should be emitted");
        assert_eq!(source_map.version, 3);
        assert_eq!(source_map.sources, vec!["counter.wc.tsx"]);
        assert_eq!(source_map.sources_content, vec![source.to_owned()]);
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
        assert!(result.code.contains("new CustomEvent(\"change\""));
        assert!(result.code.contains("this.#text0.data"));
    }

    #[test]
    fn transform_component_module_should_reuse_declarative_shadow_roots() {
        let source = r#"
            import { state } from "@iktia/core";

            export function Counter() {
              const count = state(0);

              return (
                <button onClick={() => count.set(count() + 1)}>
                  {count()}
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
                .contains("const existingRoot = this.shadowRoot;")
        );
        assert!(result.code.contains("this.#usesDeclarativeRoot = true;"));
        assert!(
            result
                .code
                .contains("this.#root = this.attachShadow({ mode: \"open\" });")
        );
        assert!(result.code.contains("this.#hydrate();"));
        assert!(result.code.contains("#requiredHydrationElement(marker)"));
        assert!(result.code.contains("this.#remount();"));
    }

    #[test]
    fn transform_component_module_should_generate_function_component_element() {
        let source = r#"
            import { event, state } from "@iktia/core";

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
    fn transform_component_module_should_generate_state_computed_and_effects() {
        let source = r#"
            import { computed, effect, event, state } from "@iktia/core";

            export function Counter({ label = "Count" }: CounterProps = {}) {
              const count = state(0);
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
            import { Show, computed, effect, event, host, on, state } from "@iktia/core";

            export function ToggleList({ visible = true }: ToggleListProps = {}) {
              const pressed = state(false);
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
                  {items().map((item, index) => (
                      <span key={item} part="indicator" data-index={index}>
                        {item}
                      </span>
                  ))}
                </button>
              );
            }
        "#;

        let result = match transform_component_module(source, "toggle-list.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.code.contains("data-iktia-control\", \"show"));
        assert!(result.code.contains("data-iktia-control\", \"for"));
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
    fn transform_component_module_should_reject_unkeyed_map_jsx_children() {
        let source = r#"
            import { computed } from "@iktia/core";

            export function List() {
              const items = computed(() => ["One", "Two"]);

              return (
                <ul>
                  {items().map((item) => <li>{item}</li>)}
                </ul>
              );
            }
        "#;

        let error = transform_component_module(source, "list.wc.tsx")
            .expect_err("unkeyed map JSX child should be rejected");

        assert!(error.to_string().contains("require a key attribute"));
    }

    #[test]
    fn transform_component_module_should_reject_map_block_bodies() {
        let source = r#"
            import { computed } from "@iktia/core";

            export function List() {
              const items = computed(() => ["One", "Two"]);

              return (
                <ul>
                  {items().map((item) => {
                    return <li key={item}>{item}</li>;
                  })}
                </ul>
              );
            }
        "#;

        let error = transform_component_module(source, "list.wc.tsx")
            .expect_err("map block body should be rejected");

        assert!(error.to_string().contains("expression body"));
    }

    #[test]
    fn transform_component_module_should_reject_non_jsx_map_returns() {
        let source = r#"
            import { computed } from "@iktia/core";

            export function List() {
              const items = computed(() => ["One", "Two"]);

              return <ul>{items().map((item) => item)}</ul>;
            }
        "#;

        let error = transform_component_module(source, "list.wc.tsx")
            .expect_err("non-JSX map return should be rejected");

        assert!(error.to_string().contains("must return a JSX element"));
    }

    #[test]
    fn transform_component_module_should_reject_conditional_jsx_children() {
        let source = r#"
            import { state } from "@iktia/core";

            export function Status() {
              const ready = state(false);

              return (
                <section>
                  {ready() ? <span>Ready</span> : <span>Waiting</span>}
                </section>
              );
            }
        "#;

        let error = transform_component_module(source, "status.wc.tsx")
            .expect_err("conditional JSX child should be rejected");

        assert!(error.to_string().contains("Use the explicit <Show"));
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
            import { type ComponentOptions } from "@iktia/core";
            import css from "./button.css?inline";

            export const options = {
              styles: [css],
            } satisfies ComponentOptions;

            export function Button() {
              return (
                <button part="button">
                  <slot name="icon" />
                  <slot />
                </button>
              );
            }
        "#;

        let result = match transform_component_module(source, "button.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(
            result
                .code
                .contains("import css from \"./button.css?inline\";")
        );
        assert!(result.code.contains("style.textContent"));
        assert!(result.code.contains("[css].join(\"\\n\")"));
        assert!(result.code.contains("document.createElement(\"slot\")"));
        assert!(result.code.contains("setAttribute(\"name\", \"icon\")"));
        assert!(result.code.contains("setAttribute(\"part\", \"button\")"));
    }

    #[test]
    fn render_declarative_shadow_dom_module_should_serialize_counter_shell() {
        let source = r#"
            import { event, state, type ComponentOptions } from "@iktia/core";

            export const options = {
              styles: [":host { display: inline-block; }"],
            } satisfies ComponentOptions;

            export function Counter({ label = "Count" }: CounterProps = {}) {
              const count = state(0);
              const change = event<number>("change");

              return (
                <button part="button" data-count={count()} onClick={() => change.emit(count())}>
                  {`${label}: ${count()}`}
                </button>
              );
            }
        "#;

        let result = match render_declarative_shadow_dom_module(
            source,
            "counter.wc.tsx",
            Some(r#"{"label":"Clicks"}"#),
        ) {
            Ok(result) => result,
            Err(error) => panic!("DSD render failed: {error}"),
        };

        assert_eq!(result.tag_name, "x-counter");
        assert!(result.uses_declarative_shadow_dom);
        assert!(result.html.starts_with("<x-counter label=\"Clicks\">"));
        assert!(
            result
                .template_html
                .contains("<template shadowrootmode=\"open\">")
        );
        assert!(
            result
                .template_html
                .contains("<style>:host { display: inline-block; }</style>")
        );
        assert!(result.template_html.contains("data-iktia-root=\"\""));
        assert!(result.template_html.contains("data-iktia-node=\"node0\""));
        assert!(result.template_html.contains("data-count=\"0\""));
        assert!(result.template_html.contains("data-iktia-text=\"text0\""));
        assert!(result.template_html.contains("Clicks: 0"));
        assert!(!result.template_html.contains("onClick"));
    }

    #[test]
    fn render_declarative_shadow_dom_module_should_serialize_resolved_inline_css() {
        let source = r#"
            import { type ComponentOptions } from "@iktia/core";
            import css from "./counter.css?inline";

            export const options = {
              styles: [css],
            } satisfies ComponentOptions;

            export function Counter() {
              return <button>Count</button>;
            }
        "#;

        let result = match render_declarative_shadow_dom_module_with_inline_styles(
            source,
            "counter.wc.tsx",
            None,
            Some(r#"{"css":":host { display: block; }"}"#),
        ) {
            Ok(result) => result,
            Err(error) => panic!("DSD render failed: {error}"),
        };

        assert!(
            result
                .template_html
                .contains("<style>:host { display: block; }</style>")
        );
    }

    #[test]
    fn render_declarative_shadow_dom_module_should_mark_unsupported_dynamic_values() {
        let source = r#"
            import { computed, state } from "@iktia/core";

            export function Counter({ label = "Count" }: CounterProps = {}) {
              const count = state(0);
              const text = computed(() => `${label}: ${count()}`);

              return <button>{text()}</button>;
            }
        "#;

        let result = match render_declarative_shadow_dom_module(source, "counter.wc.tsx", None) {
            Ok(result) => result,
            Err(error) => panic!("DSD render failed: {error}"),
        };

        assert!(result.template_html.contains("data-iktia-text=\"text0\""));
        assert!(!result.template_html.contains("Count: 0"));
    }

    #[test]
    fn render_declarative_shadow_dom_module_should_evaluate_literal_initial_values() {
        let source = r#"
            import { state } from "@iktia/core";

            export function Snapshot({ label = "Count" }: SnapshotProps = {}) {
              const items = state(["A", label]);
              const meta = state({ name: label, count: 0 });
              const unsupported = state(makeValue());

              return (
                <section data-items={items()} data-meta={meta()}>
                  {`${label}: ${items()}`}
                  {unsupported()}
                </section>
              );
            }
        "#;

        let result = match render_declarative_shadow_dom_module(source, "snapshot.wc.tsx", None) {
            Ok(result) => result,
            Err(error) => panic!("DSD render failed: {error}"),
        };

        assert!(
            result
                .template_html
                .contains("data-items=\"[&quot;A&quot;,&quot;Count&quot;]\"")
        );
        assert!(
            result
                .template_html
                .contains("data-meta=\"{&quot;count&quot;:0,&quot;name&quot;:&quot;Count&quot;}\"")
        );
        assert!(result.template_html.contains("Count: [\"A\",\"Count\"]"));
        assert!(
            result
                .template_html
                .contains("data-iktia-text=\"text1\"></span>")
        );
    }

    #[test]
    fn render_declarative_shadow_dom_module_should_reject_non_object_props() {
        let source = r#"
            export function Counter() {
              return <button>Count</button>;
            }
        "#;

        let error = render_declarative_shadow_dom_module(source, "counter.wc.tsx", Some("[]"))
            .expect_err("non-object props should be rejected");

        assert!(error.to_string().contains("DSD prerender props"));
    }
}
