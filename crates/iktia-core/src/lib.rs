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
    EventDefinition, KeyedSelectorDefinition, PropAccess, PropDefinition, PropKind, SourceMap,
    StateDefinition, StateKind, StyleImport, TransformResult,
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
        DiagnosticSeverity, StateKind, analyze_component_module, core_version,
        render_declarative_shadow_dom_module,
        render_declarative_shadow_dom_module_with_inline_styles, transform_component_module,
    };
    use crate::error::{
        DIAGNOSTIC_CODE_COMPONENT_TEMPLATE_REQUIRED, DIAGNOSTIC_CODE_DSD_INPUT,
        DIAGNOSTIC_CODE_REMOVED_AUTHORING_API, DIAGNOSTIC_CODE_TEMPLATE_PARSE,
        DIAGNOSTIC_CODE_UNSUPPORTED_COMPONENT_OPTIONS,
        DIAGNOSTIC_CODE_UNSUPPORTED_COMPUTED_CALLBACK, DIAGNOSTIC_CODE_UNSUPPORTED_CONDITIONAL_JSX,
        DIAGNOSTIC_CODE_UNSUPPORTED_EFFECT_CALLBACK, DIAGNOSTIC_CODE_UNSUPPORTED_FACTORY_RENDER,
        DIAGNOSTIC_CODE_UNSUPPORTED_FUNCTION_PROPS, DIAGNOSTIC_CODE_UNSUPPORTED_LIST_RENDERER,
        DIAGNOSTIC_CODE_UNSUPPORTED_SHOW_FALLBACK, DIAGNOSTIC_CODE_UNSUPPORTED_SWITCH_MATCH,
        DIAGNOSTIC_CODE_UNSUPPORTED_SYNTAX,
    };

    #[test]
    fn core_version_should_match_crate_version() {
        assert_eq!(core_version(), env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn diagnostic_catalog_code_literals_should_stay_stable() {
        let codes = [
            (DIAGNOSTIC_CODE_DSD_INPUT, "IKTIA_DSD_INPUT"),
            (
                DIAGNOSTIC_CODE_COMPONENT_TEMPLATE_REQUIRED,
                "IKTIA_COMPONENT_TEMPLATE_REQUIRED",
            ),
            (
                DIAGNOSTIC_CODE_REMOVED_AUTHORING_API,
                "IKTIA_REMOVED_AUTHORING_API",
            ),
            (DIAGNOSTIC_CODE_TEMPLATE_PARSE, "IKTIA_TEMPLATE_PARSE"),
            (
                DIAGNOSTIC_CODE_UNSUPPORTED_COMPONENT_OPTIONS,
                "IKTIA_UNSUPPORTED_COMPONENT_OPTIONS",
            ),
            (
                DIAGNOSTIC_CODE_UNSUPPORTED_CONDITIONAL_JSX,
                "IKTIA_UNSUPPORTED_CONDITIONAL_JSX",
            ),
            (
                DIAGNOSTIC_CODE_UNSUPPORTED_COMPUTED_CALLBACK,
                "IKTIA_UNSUPPORTED_COMPUTED_CALLBACK",
            ),
            (
                DIAGNOSTIC_CODE_UNSUPPORTED_EFFECT_CALLBACK,
                "IKTIA_UNSUPPORTED_EFFECT_CALLBACK",
            ),
            (
                DIAGNOSTIC_CODE_UNSUPPORTED_FUNCTION_PROPS,
                "IKTIA_UNSUPPORTED_FUNCTION_PROPS",
            ),
            (
                DIAGNOSTIC_CODE_UNSUPPORTED_FACTORY_RENDER,
                "IKTIA_UNSUPPORTED_FACTORY_RENDER",
            ),
            (
                DIAGNOSTIC_CODE_UNSUPPORTED_LIST_RENDERER,
                "IKTIA_UNSUPPORTED_LIST_RENDERER",
            ),
            (
                DIAGNOSTIC_CODE_UNSUPPORTED_SHOW_FALLBACK,
                "IKTIA_UNSUPPORTED_SHOW_FALLBACK",
            ),
            (
                DIAGNOSTIC_CODE_UNSUPPORTED_SWITCH_MATCH,
                "IKTIA_UNSUPPORTED_SWITCH_MATCH",
            ),
            (
                DIAGNOSTIC_CODE_UNSUPPORTED_SYNTAX,
                "IKTIA_UNSUPPORTED_SYNTAX",
            ),
        ];

        for (actual, expected) in codes {
            assert_eq!(actual, expected);
        }
    }

    fn assert_diagnostic<T: std::fmt::Debug>(
        result: Result<T, super::CompilerError>,
        filename: &str,
        code: &str,
        message: &str,
        hint: &str,
    ) {
        let error = result.expect_err("fixture should fail with a diagnostic");
        let diagnostics = error.diagnostics(filename);
        let diagnostic = diagnostics
            .first()
            .expect("compiler error should expose diagnostics");

        assert_eq!(diagnostic.code, code, "{filename}");
        assert_eq!(diagnostic.severity, DiagnosticSeverity::Error, "{filename}");
        assert_eq!(diagnostic.filename, filename);
        assert!(
            diagnostic.message.contains(message),
            "{filename} message should contain {message:?}, got {:?}",
            diagnostic.message
        );
        if let Some(span) = diagnostic.span {
            assert!(span.start < span.end, "{filename} span should be non-empty");
        }
        let diagnostic_hint = diagnostic.hint.as_deref().expect("hint should be present");
        assert!(
            diagnostic_hint.contains(hint),
            "{filename} hint should contain {hint:?}, got {diagnostic_hint:?}"
        );
    }

    fn assert_diagnostic_source_span<T: std::fmt::Debug>(
        result: Result<T, super::CompilerError>,
        source: &str,
        filename: &str,
        expected_source: &str,
    ) {
        let error = result.expect_err("fixture should fail with a diagnostic");
        let diagnostic = error
            .diagnostics(filename)
            .into_iter()
            .next()
            .expect("compiler error should expose diagnostics");
        let span = diagnostic
            .span
            .expect("diagnostic should expose a source span");

        assert_eq!(
            &source[span.start..span.end],
            expected_source,
            "{filename} span should point at the rejected source"
        );
    }

    #[test]
    fn compiler_diagnostics_should_use_catalog_codes_and_hints() {
        let cases = [
            (
                "removed-signal.wc.tsx",
                r#"
                    import { signal } from "@iktia/core";

                    export function RemovedSignal() {
                      const count = signal(0);
                      return <button>{count()}</button>;
                    }
                "#,
                DIAGNOSTIC_CODE_REMOVED_AUTHORING_API,
                "signal() was removed",
                "function component authoring API",
            ),
            (
                "unsupported-options.wc.tsx",
                r#"
                    import { state, type ComponentOptions } from "@iktia/core";

                    export const options = {
                      shadow: false,
                    } satisfies ComponentOptions;

                    export function UnsupportedOptions() {
                      const count = state(0);
                      return <button>{count()}</button>;
                    }
                "#,
                DIAGNOSTIC_CODE_UNSUPPORTED_COMPONENT_OPTIONS,
                "Component options only support `styles`",
                "export const options",
            ),
            (
                "rest-props.wc.tsx",
                r#"
                    export function RestProps({ label = "Count", ...rest }: RestProps = {}) {
                      return <button>{label}</button>;
                    }
                "#,
                DIAGNOSTIC_CODE_UNSUPPORTED_FUNCTION_PROPS,
                "rest props are not supported",
                "Declare explicit destructured props",
            ),
            (
                "missing-template.wc.tsx",
                r#"
                    import { state } from "@iktia/core";

                    export function MissingTemplate() {
                      const count = state(0);
                      count.set(1);
                    }
                "#,
                DIAGNOSTIC_CODE_COMPONENT_TEMPLATE_REQUIRED,
                "must return a TSX template",
                "single JSX return",
            ),
            (
                "factory-render.wc.tsx",
                r#"
                    import { state } from "@iktia/core";

                    export function FactoryRender() {
                      const count = state(0);
                      return () => <button>{count()}</button>;
                    }
                "#,
                DIAGNOSTIC_CODE_UNSUPPORTED_FACTORY_RENDER,
                "return () => JSX",
                "single JSX template",
            ),
            (
                "factory-render-block.wc.tsx",
                r#"
                    import { state } from "@iktia/core";

                    export function FactoryRenderBlock() {
                      const count = state(0);
                      return () => {
                        return <button>{count()}</button>;
                      };
                    }
                "#,
                DIAGNOSTIC_CODE_UNSUPPORTED_FACTORY_RENDER,
                "instance setup declarations",
                "single JSX template",
            ),
            (
                "computed-block.wc.tsx",
                r#"
                    import { computed, state } from "@iktia/core";

                    export function ComputedBlock() {
                      const count = state(0);
                      const doubled = computed(() => {
                        return count() * 2;
                      });
                      return <button>{doubled()}</button>;
                    }
                "#,
                DIAGNOSTIC_CODE_UNSUPPORTED_COMPUTED_CALLBACK,
                "computed() must use an expression body",
                "authoring limitations",
            ),
            (
                "effect-malformed-callback.wc.tsx",
                r#"
                    import { effect, state } from "@iktia/core";

                    export function EffectMalformedCallback() {
                      const count = state(0);
                      effect((() => {
                        count.set(1);
                      }) satisfies () => void);
                      return <button>{count()}</button>;
                    }
                "#,
                DIAGNOSTIC_CODE_UNSUPPORTED_EFFECT_CALLBACK,
                "effect() callback body is malformed",
                "authoring limitations",
            ),
            (
                "unkeyed-map.wc.tsx",
                r#"
                    import { computed } from "@iktia/core";

                    export function UnkeyedMap() {
                      const items = computed(() => ["One", "Two"]);
                      return <ul>{items().map((item) => <li>{item}</li>)}</ul>;
                    }
                "#,
                DIAGNOSTIC_CODE_UNSUPPORTED_LIST_RENDERER,
                "require a key attribute",
                "keyed .map()",
            ),
            (
                "conditional-jsx.wc.tsx",
                r#"
                    import { state } from "@iktia/core";

                    export function ConditionalJsx() {
                      const ready = state(false);
                      return <section>{ready() ? <span>Ready</span> : <span>Waiting</span>}</section>;
                    }
                "#,
                DIAGNOSTIC_CODE_UNSUPPORTED_CONDITIONAL_JSX,
                "Conditional JSX expressions are not supported",
                "<Show",
            ),
            (
                "show-fallback.wc.tsx",
                r#"
                    import { Show, state } from "@iktia/core";

                    export function ShowFallback() {
                      const ready = state(false);
                      return <Show when={ready()} fallback><span>Ready</span></Show>;
                    }
                "#,
                DIAGNOSTIC_CODE_UNSUPPORTED_SHOW_FALLBACK,
                "Show fallback must have a value",
                "<Show",
            ),
        ];

        for (filename, source, code, message, hint) in cases {
            assert_diagnostic(
                transform_component_module(source, filename),
                filename,
                code,
                message,
                hint,
            );
        }

        assert_diagnostic(
            render_declarative_shadow_dom_module(
                r#"
                    export function Counter() {
                      return <button>Count</button>;
                    }
                "#,
                "counter.wc.tsx",
                Some("[]"),
            ),
            "counter.wc.tsx",
            DIAGNOSTIC_CODE_DSD_INPUT,
            "DSD prerender props must be a JSON object",
            "JSON objects",
        );

        assert_diagnostic(
            Result::<(), super::CompilerError>::Err(crate::error::template_parse(
                "Attribute `data-count` must use a quoted or braced value.",
            )),
            "template-parse.wc.tsx",
            DIAGNOSTIC_CODE_TEMPLATE_PARSE,
            "Attribute `data-count` must use a quoted or braced value",
            "authoring limitations",
        );
    }

    #[test]
    fn compiler_diagnostics_should_include_ast_source_spans() {
        let removed_signal_source = r#"
            import { signal } from "@iktia/core";

            export function RemovedSignal() {
              const count = signal(0);
              return <button>{count()}</button>;
            }
        "#;

        assert_diagnostic_source_span(
            transform_component_module(removed_signal_source, "removed-signal.wc.tsx"),
            removed_signal_source,
            "removed-signal.wc.tsx",
            "signal(0)",
        );

        let computed_block_source = r#"
            import { computed, state } from "@iktia/core";

            export function ComputedBlock() {
              const count = state(0);
              const doubled = computed(() => {
                return count() * 2;
              });
              return <button>{doubled()}</button>;
            }
        "#;

        assert_diagnostic_source_span(
            transform_component_module(computed_block_source, "computed-block.wc.tsx"),
            computed_block_source,
            "computed-block.wc.tsx",
            "() => {\n                return count() * 2;\n              }",
        );

        let factory_render_source = r#"
            import { state } from "@iktia/core";

            export function FactoryRender() {
              const count = state(0);
              return () => <button>{count()}</button>;
            }
        "#;

        assert_diagnostic_source_span(
            transform_component_module(factory_render_source, "factory-render.wc.tsx"),
            factory_render_source,
            "factory-render.wc.tsx",
            "() => <button>{count()}</button>",
        );
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
        assert!(result.code.contains("#computedCache = new Map();"));
        assert!(result.code.contains("const doubled = () => {"));
        assert!(
            result
                .code
                .contains("this.#computedCache.set(\"doubled\", (count() * 2));")
        );
        assert!(result.code.contains("#runEffects(dirtySources)"));
        assert!(result.code.contains("this.#markDirty(\"count\");"));
        assert!(result.code.contains("this.#scheduleFlush();"));
        assert!(
            result
                .code
                .contains("if (this.#shouldUpdate([\"count\"], dirtySources))")
        );
        assert!(result.code.contains("document.body.dataset.lastEffect"));
        assert!(result.code.contains("this.#flushSync();"));
        assert!(result.code.contains("new CustomEvent(\"change\""));
        assert!(result.code.contains("bubbles: true"));
        assert!(result.code.contains("composed: true"));
        assert!(result.code.contains("cancelable: false"));
    }

    #[test]
    fn transform_component_module_should_keep_unknown_reactive_reads_broad() {
        let source = r#"
            import { effect, state } from "@iktia/core";

            export function Probe() {
              const count = state(0);

              effect(() => {
                observeExternalRead();
              });

              return <button>{count()}</button>;
            }
        "#;

        let result = match transform_component_module(source, "probe.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(
            result
                .code
                .contains("if (this.#shouldUpdate(null, dirtySources))")
        );
        assert!(
            result
                .code
                .contains("if (this.#shouldUpdate([\"count\"], dirtySources))")
        );
    }

    #[test]
    fn transform_component_module_should_ignore_comments_and_strings_in_dependency_detection() {
        let source = r#"
            import { computed, effect, state } from "@iktia/core";

            export function Probe() {
              const count = state(0);
              const label = computed(() => `Count ${count()}`);

              effect(() => {
                console.info("observeExternalRead() count() label()");
                // observeExternalRead();
                /* anotherExternalRead(); */
                document.body.dataset.label = `${label()}`;
              });

              return <button title={`literal count() ${label()}`}>{label()}</button>;
            }
        "#;

        let result = match transform_component_module(source, "probe.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(
            !result
                .code
                .contains("this.#shouldUpdate(null, dirtySources)")
        );
        assert!(
            result
                .code
                .contains("if (this.#shouldUpdate([\"count\"], dirtySources))")
        );
    }

    #[test]
    fn transform_component_module_should_keep_host_reads_dependency_neutral() {
        let source = r#"
            import { effect, host, state } from "@iktia/core";

            export function Probe() {
              const count = state(0);

              effect(() => {
                host().element.dataset.count = String(count());
              });

              return <button>{count()}</button>;
            }
        "#;

        let result = match transform_component_module(source, "probe.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(
            !result
                .code
                .contains("this.#shouldUpdate(null, dirtySources)")
        );
        assert!(
            result
                .code
                .contains("if (this.#shouldUpdate([\"count\"], dirtySources))")
        );
    }

    #[test]
    fn transform_component_module_should_skip_comments_between_reactive_accessor_and_call() {
        let source = r#"
            import { state } from "@iktia/core";

            export function Probe() {
              const count = state(0);

              return <button>{count /* stable accessor */ ()}</button>;
            }
        "#;

        let result = match transform_component_module(source, "probe.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(
            result
                .code
                .contains("if (this.#shouldUpdate([\"count\"], dirtySources))")
        );
    }

    #[test]
    fn transform_component_module_should_generate_lifecycle_callbacks() {
        let source = r#"
            import { onConnected, onDisconnected, state } from "@iktia/core";

            export function LifecycleProbe() {
              const status = state("idle");

              onConnected(() => {
                status.set("connected");
              });
              onDisconnected(() => {
                status.set("disconnected");
              });

              return <span data-status={status()} />;
            }
        "#;

        let result = match transform_component_module(source, "lifecycle-probe.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.code.contains("connectedCallback()"));
        assert!(result.code.contains("disconnectedCallback()"));
        assert!(
            result
                .code
                .contains("const { status } = this.#createBindings();")
        );
        assert!(result.code.contains("status.set(\"connected\");"));
        assert!(result.code.contains("status.set(\"disconnected\");"));
    }

    #[test]
    fn transform_component_module_should_generate_element_refs() {
        let source = r#"
            import { onConnected, state } from "@iktia/core";

            export function RefProbe() {
              let button: HTMLButtonElement | null = null;
              const count = state(0);

              onConnected(() => {
                button?.setAttribute("data-connected", "true");
              });

              return (
                <section>
                  <button
                    ref={button}
                    data-count={count()}
                    onClick={() => {
                      button?.focus();
                      count.set(count() + 1);
                    }}
                  >
                    Clicks {count()}
                  </button>
                  <span ref={(element) => element.setAttribute("data-ref", "callback")} />
                </section>
              );
            }
        "#;

        let result = match transform_component_module(source, "ref-probe.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert_contains(&result.code, "#refs = {};");
        assert_contains(&result.code, "this.#refs.button = this.#node1;");
        assert_contains(&result.code, "this.#applyRefs();");
        assert_contains(
            &result.code,
            "((element) => element.setAttribute(\"data-ref\", \"callback\"))(this.#node2);",
        );
        assert_contains(&result.code, "const button = this.#refs.button ?? null;");
        assert_contains(&result.code, "return { count, button };");
        assert_contains(
            &result.code,
            "const { count, button } = this.#createBindings();",
        );
        assert_contains(
            &result.code,
            "button?.setAttribute(\"data-connected\", \"true\");",
        );
        assert_contains(&result.code, "button?.focus();");
        assert_contains(
            &result.code,
            "this.#node1 = this.#requiredHydrationElement(\"node1\");",
        );
        assert_not_contains(&result.code, "setAttribute(\"ref\"");
        assert_not_contains(&result.code, "this.#shouldUpdate([\"button\"]");
    }

    #[test]
    fn render_declarative_shadow_dom_module_should_omit_element_refs() {
        let source = r#"
            import { state } from "@iktia/core";

            export function RefProbe() {
              let button: HTMLButtonElement | null = null;
              const count = state(0);

              return (
                <button
                  ref={button}
                  data-count={count()}
                  onClick={() => button?.focus()}
                >
                  {count()}
                </button>
              );
            }
        "#;

        let result = match render_declarative_shadow_dom_module(source, "ref-probe.wc.tsx", None) {
            Ok(result) => result,
            Err(error) => panic!("DSD render failed: {error}"),
        };

        assert_contains(&result.template_html, "data-count=\"0\"");
        assert_contains(&result.template_html, ">0<");
        assert_not_contains(&result.template_html, "ref=");
        assert_not_contains(&result.template_html, "button?.focus");
        assert_not_contains(&result.template_html, "onClick");
    }

    #[test]
    fn transform_component_module_should_reject_ref_binding_name_conflicts() {
        let source = r#"
            import { state } from "@iktia/core";

            export function RefConflict() {
              const count = state(0);

              return <button ref={count}>{count()}</button>;
            }
        "#;

        let error = transform_component_module(source, "ref-conflict.wc.tsx")
            .expect_err("conflicting ref binding should be rejected");

        assert!(error.to_string().contains("conflicts"));
        assert!(error.to_string().contains("count"));
    }

    #[test]
    fn transform_component_module_should_reject_refs_inside_dynamic_list_rows() {
        let source = r#"
            import { state } from "@iktia/core";

            export function RefList() {
              let row: HTMLButtonElement | null = null;
              const items = state(["A", "B"]);

              return (
                <ul>
                  {items().map((item) => (
                    <li key={item} ref={row}>{item}</li>
                  ))}
                </ul>
              );
            }
        "#;

        let error = transform_component_module(source, "ref-list.wc.tsx")
            .expect_err("dynamic row refs should be rejected");

        assert!(error.to_string().contains("ref"));
        assert!(error.to_string().contains("dynamic list row"));
    }

    #[test]
    fn transform_component_module_should_initialize_state_from_props_in_instance_context() {
        let source = r#"
            import { state } from "@iktia/core";

            export function Snapshot({
              checked = false,
              label = "Ready",
              step = 1,
            }: SnapshotProps = {}) {
              const selected = state(checked);
              const text = state(label);
              const count = state(step);

              return (
                <button
                  aria-pressed={selected()}
                  data-count={count()}
                  data-label={label}
                  data-step={step}
                >
                  {text()}
                </button>
              );
            }
        "#;

        let result = match transform_component_module(source, "snapshot.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.code.contains("#state = {};"));
        assert!(result.code.contains("#initializeState()"));
        assert!(result.code.contains("const checked = this.#props.checked;"));
        assert!(result.code.contains("this.#state.selected = checked;"));
        assert!(result.code.contains("this.#state.text = label;"));
        assert!(result.code.contains("this.#state.count = step;"));
        assert!(!result.code.contains("#state = {\n    selected: checked"));

        // This fixture intentionally does not use formControl(), which has its
        // own valid initialization call from generated form reset handling.
        assert_eq!(
            occurrence_count(&result.code, "this.#initializeState();"),
            1,
            "state setup should run only from the first connectedCallback mount path"
        );

        let connected_callback = section_between(
            &result.code,
            "  connectedCallback() {",
            "\n  attributeChangedCallback",
        );
        assert_contains(connected_callback, "if (!this.#mounted) {");
        assert_contains(connected_callback, "this.#initializeState();");
        assert_contains(connected_callback, "this.#mounted = true;");

        let attribute_changed = section_between(
            &result.code,
            "  attributeChangedCallback",
            "\n  get checked()",
        );
        assert_not_contains(attribute_changed, "#initializeState");
        assert_contains(
            attribute_changed,
            "this.#props.checked = newValue !== null;",
        );
        assert_contains(attribute_changed, "this.#markDirty(\"checked\");");
        assert_contains(
            attribute_changed,
            "this.#props.label = newValue ?? \"Ready\";",
        );
        assert_contains(attribute_changed, "this.#markDirty(\"label\");");
        assert_contains(
            attribute_changed,
            "this.#props.step = Number.isFinite(Number(newValue)) ? Number(newValue) : 1;",
        );
        assert_contains(attribute_changed, "this.#markDirty(\"step\");");
        assert_contains(attribute_changed, "this.#flushSync();");

        let step_setter =
            section_between(&result.code, "  set step(value) {", "\n  #initializeState");
        assert_not_contains(step_setter, "#initializeState");
        assert_contains(
            step_setter,
            "const nextValue = Number.isFinite(Number(value)) ? Number(value) : 1;",
        );
        assert_contains(step_setter, "this.#props.step = nextValue;");
        assert_contains(step_setter, "this.#markDirty(\"step\");");
        assert_contains(step_setter, "this.#flushSync();");

        assert_contains(&result.code, "const label = this.#props.label;");
        assert_contains(&result.code, "const step = this.#props.step;");
        assert_contains(&result.code, "const count = () => this.#state.count;");
        assert_contains(
            &result.code,
            "return { checked, label, step, selected, text, count };",
        );
        assert_contains(
            &result.code,
            "if (this.#shouldUpdate([\"label\"], dirtySources))",
        );
        assert_contains(
            &result.code,
            "if (this.#shouldUpdate([\"step\"], dirtySources))",
        );
        assert_contains(
            &result.code,
            "if (this.#shouldUpdate([\"count\"], dirtySources))",
        );
        assert_contains(
            &result.code,
            "if (this.#shouldUpdate([\"selected\"], dirtySources))",
        );
        assert_contains(
            &result.code,
            "if (this.#shouldUpdate([\"text\"], dirtySources))",
        );
    }

    #[test]
    fn transform_component_module_should_generate_form_associated_control_helpers() {
        let source = r#"
            import { formControl, state } from "@iktia/core";

            export function Check({
              checked = false,
              disabled = false,
              value = "on",
            }: CheckProps = {}) {
              const selected = state(checked);
              const form = formControl({
                value: () => selected() ? value : null,
                reset: () => {
                  selected.set(checked);
                },
                disabled,
              });
              void form;

              return (
                <button
                  disabled={disabled}
                  aria-pressed={selected()}
                  onClick={() => selected.update((current) => !current)}
                >
                  {value}
                </button>
              );
            }
        "#;

        let result = match transform_component_module(source, "check.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.code.contains("static formAssociated = true;"));
        assert!(
            result
                .code
                .contains("this.#internals = this.attachInternals();")
        );
        assert!(result.code.contains("#syncFormValue(dirtySources)"));
        assert!(
            result
                .code
                .contains("this.#internals.setFormValue(selected() ? value : null);")
        );
        assert!(result.code.contains("formResetCallback()"));
        assert!(result.code.contains("selected.set(checked);"));
        assert!(result.code.contains("formDisabledCallback(disabled)"));
        assert!(result.code.contains("this.disabled = disabled;"));
    }

    #[test]
    fn transform_component_module_should_map_common_dom_event_attribute_names() {
        let source = r#"
            import { on } from "@iktia/core";

            export function KeyboardButton() {
              return (
                <button
                  onKeyDown={on("keydown", () => {})}
                  onPointerDown={on("pointerdown", () => {})}
                  onPointerMove={on("pointermove", () => {})}
                  onPointerOver={on("pointerover", () => {})}
                  onPointerLeave={on("pointerleave", () => {})}
                  onPointerCancel={on("pointercancel", () => {})}
                  onContextMenu={on("contextmenu", () => {})}
                  onBeforeInput={on("beforeinput", () => {})}
                >
                  Move
                </button>
              );
            }
        "#;

        let result = match transform_component_module(source, "keyboard-button.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.code.contains("addEventListener(\"keydown\""));
        assert!(result.code.contains("addEventListener(\"pointerdown\""));
        assert!(result.code.contains("addEventListener(\"pointermove\""));
        assert!(result.code.contains("addEventListener(\"pointerover\""));
        assert!(result.code.contains("addEventListener(\"pointerleave\""));
        assert!(result.code.contains("addEventListener(\"pointercancel\""));
        assert!(result.code.contains("addEventListener(\"contextmenu\""));
        assert!(result.code.contains("addEventListener(\"beforeinput\""));
        assert!(!result.code.contains("addEventListener(\"key-down\""));
        assert!(!result.code.contains("addEventListener(\"pointer-down\""));
        assert!(!result.code.contains("addEventListener(\"pointer-move\""));
        assert!(!result.code.contains("addEventListener(\"pointer-over\""));
        assert!(!result.code.contains("addEventListener(\"pointer-leave\""));
        assert!(!result.code.contains("addEventListener(\"pointer-cancel\""));
        assert!(!result.code.contains("addEventListener(\"context-menu\""));
        assert!(!result.code.contains("addEventListener(\"before-input\""));
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
        assert!(
            result
                .code
                .contains("update: () => { this.#markAllDirty(); this.#scheduleFlush(); },")
        );
        assert!(result.code.contains("flushSync: () => this.#flushSync(),"));
        assert!(result.code.contains("this.#abortController.abort();"));
    }

    #[test]
    fn transform_component_module_should_generate_switch_match_control_flow() {
        let source = r#"
            import { Match, Switch, state } from "@iktia/core";

            export function StatusPanel() {
              const status = state("loading");

              return (
                <section>
                  <Switch>
                    <Match when={status() === "loading"}>
                      <p part="status">Loading</p>
                    </Match>
                    <Match when={status() === "error"}>
                      <p part="status error">Error</p>
                    </Match>
                    <Match when={status() === "empty"}>
                      <p part="status">Empty</p>
                    </Match>
                    <Match>
                      <p part="status">Ready</p>
                    </Match>
                  </Switch>
                </section>
              );
            }
        "#;

        let result = match transform_component_module(source, "status-panel.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.code.contains("data-iktia-control\", \"switch"));
        assert!(result.code.contains("let node1Matched = false;"));
        assert!(
            result
                .code
                .contains("const node1Match0When = Boolean(status() === \"loading\");")
        );
        assert!(
            result
                .code
                .contains("this.#node1Match0.hidden = node1Matched || !node1Match0When;")
        );
        assert!(
            result
                .code
                .contains("node1Matched = node1Matched || node1Match1When;")
        );
        assert!(
            result
                .code
                .contains("this.#node1Match3.hidden = node1Matched;")
        );
        assert!(
            result
                .code
                .contains("if (this.#shouldUpdate([\"status\"], dirtySources))")
        );
    }

    #[test]
    fn transform_component_module_should_generate_for_and_index_reconcilers() {
        let source = r#"
            import { For, Index, state } from "@iktia/core";

            export function ListProbe() {
              const rows = state([{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }]);
              const names = state(["Alpha", "Beta"]);

              return (
                <section>
                  <For each={rows()}>
                    {(row, index) => (
                      <button key={row.id} data-id={row.id} data-index={index}>
                        {row.label}
                      </button>
                    )}
                  </For>
                  <Index each={names()}>
                    {(name, index) => (
                      <input data-index={index} value={name()} />
                    )}
                  </Index>
                </section>
              );
            }
        "#;

        let result = match transform_component_module(source, "list-probe.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.code.contains("#node1Records = new Map();"));
        assert!(result.code.contains("#node2Records = new Map();"));
        assert!(result.code.contains("this.#node1Records.get(for1Key)"));
        assert!(result.code.contains("this.#node2Records.get(for2Key)"));
        assert!(
            result
                .code
                .contains("const name = () => node2Record.value;")
        );
        assert!(
            result
                .code
                .contains("node2Record.for2Node0.value = String(for2Node0_value_value);")
        );
        assert!(
            result
                .code
                .contains("let node1Cursor = this.#node1.firstChild;")
        );
        assert!(
            result
                .code
                .contains("this.#node1.insertBefore(node1OrderedNode, node1Cursor);")
        );
        assert!(
            result
                .code
                .contains("let node2Cursor = this.#node2.firstChild;")
        );
        assert!(
            result
                .code
                .contains("this.#node2.insertBefore(node2OrderedNode, node2Cursor);")
        );
        assert!(!result.code.contains("this.#node1.replaceChildren("));
        assert!(!result.code.contains("this.#node2.replaceChildren("));
        assert!(!result.code.contains(".map(("));
    }

    #[test]
    fn transform_component_module_should_lower_keyed_selector_bindings() {
        let source = r#"
            import { For, state } from "@iktia/core";

            export function SelectorProbe() {
              const rows = state([{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }]);
              const selected = state("a");
              const isSelected = (id: string) => selected() === id;

              return (
                <section>
                  <For each={rows()}>
                    {(row) => (
                      <button
                        key={row.id}
                        aria-selected={isSelected(row.id)}
                        data-state={isSelected(row.id) ? "selected" : "idle"}
                      >
                        {row.label}
                      </button>
                    )}
                  </For>
                </section>
              );
            }
        "#;

        let result = match transform_component_module(source, "selector-probe.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.code.contains("#keyedBindingRegistry = new Map();"));
        assert!(
            result
                .code
                .contains("const isSelected = (id) => selected() === id;")
        );
        assert!(
            result
                .code
                .contains("this.#markKeyedSelectorDirty(\"isSelected\", previousValue, value);")
        );
        assert!(result.code.contains("#runKeyedBindings(dirtySources);"));
        assert!(
            result
                .code
                .contains("this.#registerKeyedBinding(\"isSelected\", row.id,")
        );
        assert_eq!(
            result
                .code
                .matches("this.#registerKeyedBinding(\"isSelected\", row.id,")
                .count(),
            2
        );
        assert!(result.code.contains("bindings.set(bindingName, update);"));
        assert!(result.code.contains("const row = node1Record.value;"));
        assert!(
            result
                .code
                .contains("if (this.#shouldUpdate([\"rows\"], dirtySources))")
        );
        assert!(
            !result
                .code
                .contains("if (this.#shouldUpdate([\"rows\", \"selected\"], dirtySources))")
        );
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

        assert!(
            error
                .to_string()
                .contains("Use explicit <Show> or <Switch>")
        );
    }

    #[test]
    fn transform_component_module_should_reject_invalid_switch_match_structure() {
        let source = r#"
            import { Match, Switch, state } from "@iktia/core";

            export function StatusPanel() {
              const ready = state(false);

              return (
                <Switch>
                  <Match>Default</Match>
                  <Match when={ready()}>Ready</Match>
                </Switch>
              );
            }
        "#;

        let error = transform_component_module(source, "status-panel.wc.tsx")
            .expect_err("default Match before conditional Match should be rejected");

        assert!(
            error
                .to_string()
                .contains("default <Match> must be the last arm")
        );
    }

    #[test]
    fn transform_component_module_should_reject_match_outside_switch() {
        let source = r#"
            import { Match, state } from "@iktia/core";

            export function StatusPanel() {
              const ready = state(false);

              return <Match when={ready()}>Ready</Match>;
            }
        "#;

        let error = transform_component_module(source, "status-panel.wc.tsx")
            .expect_err("Match outside Switch should be rejected");

        assert!(error.to_string().contains("direct child of <Switch>"));
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
    fn transform_component_module_should_generate_native_jsx_spread_attributes() {
        let source = r#"
            import { computed, state } from "@iktia/core";

            export function SpreadButton() {
              const active = state(false);
              const triggerProps = computed(() => ({
                "aria-selected": active(),
                className: "from-spread",
                hidden: false,
                onKeyDown(event) {
                  event.preventDefault();
                },
                onPointerMove(event) {
                  event.preventDefault();
                },
                onPointerOver(event) {
                  event.preventDefault();
                },
                onPointerLeave(event) {
                  event.preventDefault();
                },
                onPointerCancel(event) {
                  event.preventDefault();
                },
                style: { color: active() ? "red" : "blue" },
                tabIndex: 0,
              }));

              return (
                <button part="before" {...triggerProps()} part="after" data-state={active() ? "on" : "off"}>
                  Press
                </button>
              );
            }
        "#;

        let result = match transform_component_module(source, "spread-button.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert!(result.code.contains(
            "#node0Spread0 = { names: new Set(), listeners: new Map(), styles: new Set() };"
        ));
        assert!(result.code.contains(
            "this.#applySpreadAttributes(this.#node0, this.#node0Spread0, triggerProps());"
        ));
        assert!(
            result
                .code
                .contains("removeEventListener(eventName, previous)")
        );
        assert!(result.code.contains("\"pointer-move\": \"pointermove\""));
        assert!(result.code.contains("\"pointer-over\": \"pointerover\""));
        assert!(result.code.contains("\"pointer-leave\": \"pointerleave\""));
        assert!(
            result
                .code
                .contains("\"pointer-cancel\": \"pointercancel\"")
        );
        assert!(result.code.contains("\"context-menu\": \"contextmenu\""));
        assert!(result.code.contains("\"before-input\": \"beforeinput\""));
        assert!(result.code.contains("target.style[property]"));
        assert!(
            result
                .code
                .contains("if (name === \"className\") return \"class\";")
        );
        assert!(result.code.contains(
            "const attributeValue = attributeName.startsWith(\"aria-\") ? String(value) : value === true ? \"\" : String(value);"
        ));
        assert!(
            result
                .code
                .contains("const { active, triggerProps } = this.#createBindings();")
        );
        let spread_index = result
            .code
            .find("this.#applySpreadAttributes(this.#node0, this.#node0Spread0, triggerProps());")
            .expect("spread update should be generated");
        let explicit_after_index = result.code[spread_index..]
            .find("this.#node0.setAttribute(\"part\", \"after\");")
            .expect("explicit attribute after spread should be re-applied during update");
        assert!(explicit_after_index > 0);
        assert!(result.code[spread_index..].contains(
            "if (this.#shouldUpdate(null, dirtySources)) {\n      const node0_data_state_value = active() ? \"on\" : \"off\";"
        ));
    }

    #[test]
    fn transform_component_module_should_reject_jsx_spread_on_pascal_components() {
        let source = r#"
            import { computed } from "@iktia/core";
            import { Counter } from "./counter.wc.tsx";

            export function Dashboard() {
              const counterProps = computed(() => ({ initialCount: 1 }));

              return <Counter {...counterProps()} />;
            }
        "#;

        let error = transform_component_module(source, "dashboard.wc.tsx")
            .expect_err("component spread should be rejected");

        assert!(
            error
                .to_string()
                .contains("JSX spread attributes are supported only on native elements")
        );
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
    fn render_declarative_shadow_dom_module_should_serialize_switch_match_control_flow() {
        let source = r#"
            import { Match, Switch, state } from "@iktia/core";

            export function StatusPanel() {
              const loading = state(false);
              const failed = state(false);

              return (
                <section>
                  <Switch>
                    <Match when={loading()}>
                      <p>Loading</p>
                    </Match>
                    <Match when={failed()}>
                      <p>Error</p>
                    </Match>
                    <Match>
                      <p>Ready</p>
                    </Match>
                  </Switch>
                </section>
              );
            }
        "#;

        let result = match render_declarative_shadow_dom_module(source, "status-panel.wc.tsx", None)
        {
            Ok(result) => result,
            Err(error) => panic!("DSD render failed: {error}"),
        };

        assert!(
            result
                .template_html
                .contains("data-iktia-control=\"switch\"")
        );
        assert!(
            result.template_html.contains(
                "<span style=\"display: contents\" data-iktia-node=\"node1Match0\" hidden>"
            )
        );
        assert!(
            result.template_html.contains(
                "<span style=\"display: contents\" data-iktia-node=\"node1Match1\" hidden>"
            )
        );
        assert!(
            result
                .template_html
                .contains("<span style=\"display: contents\" data-iktia-node=\"node1Match2\">")
        );
        assert!(result.template_html.contains(">Ready<"));
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

    const PRIMITIVE_CONTRACT_SOURCE: &str = r#"
        import { Show, computed, event, on, state, type ComponentOptions } from "@iktia/core";
        import css from "./toggle.css?inline";

        export const options = {
          styles: [css],
        } satisfies ComponentOptions;

        export function Toggle({ label = "Power", disabled = false }: ToggleProps = {}) {
          const pressed = state(false);
          const stateLabel = computed(() => pressed() ? "On" : "Off");
          const indicators = computed(() => pressed() ? ["Pressed", "Active"] : ["Idle"]);
          const changed = event<boolean>("toggle-change");

          return (
            <button
              part="root control"
              data-state={pressed() ? "on" : "off"}
              data-disabled={disabled || undefined}
              aria-pressed={pressed()}
              disabled={disabled}
              onClick={on("click", () => {
                if (disabled) return;
                pressed.update((value) => !value);
                changed.emit(pressed());
              })}
            >
              <span part="label">{label}</span>
              <Show when={pressed()} fallback={<span part="indicator">Off</span>}>
                <span part="indicator">{stateLabel()}</span>
              </Show>
              {indicators().map((item, index) => (
                <span key={item} part="indicator" data-index={index}>
                  {item}
                </span>
              ))}
              <slot />
            </button>
          );
        }
    "#;

    #[test]
    fn generated_custom_element_contract_should_cover_primitive_public_surface() {
        let result = match transform_component_module(PRIMITIVE_CONTRACT_SOURCE, "toggle.wc.tsx") {
            Ok(result) => result,
            Err(error) => panic!("transform failed: {error}"),
        };

        assert_contains(&result.code, "class ToggleElement extends HTMLElement");
        assert_contains(
            &result.code,
            "customElements.define(\"x-toggle\", ToggleElement)",
        );
        assert_contains(&result.code, "static get observedAttributes() {");
        assert_contains(&result.code, "return [\"label\", \"disabled\"];");
        assert_contains(&result.code, "get label()");
        assert_contains(&result.code, "set label(value)");
        assert_contains(&result.code, "get disabled()");
        assert_contains(&result.code, "set disabled(value)");
        assert_contains(&result.code, "setAttribute(\"part\", \"root control\")");
        assert_contains(&result.code, "setAttribute(\"data-state\",");
        assert_contains(&result.code, "setAttribute(\"aria-pressed\",");
        assert_contains(&result.code, "setAttribute(\"disabled\", \"\")");
        assert_contains(&result.code, "document.createElement(\"slot\")");
        assert_contains(&result.code, "new CustomEvent(\"toggle-change\"");
        assert_contains(
            &result.code,
            "bubbles: true, composed: true, cancelable: false",
        );
        assert_contains(&result.code, "style.textContent = [css].join(\"\\n\");");
    }

    #[test]
    fn generated_dsd_contract_should_cover_static_output_and_internal_markers() {
        let result = match render_declarative_shadow_dom_module_with_inline_styles(
            PRIMITIVE_CONTRACT_SOURCE,
            "toggle.wc.tsx",
            Some(r#"{"label":"Power"}"#),
            Some(r#"{"css":":host { display: inline-block; }"}"#),
        ) {
            Ok(result) => result,
            Err(error) => panic!("DSD render failed: {error}"),
        };

        assert_eq!(result.tag_name, "x-toggle");
        assert_eq!(result.class_name, "ToggleElement");
        assert_eq!(result.export_name.as_deref(), Some("Toggle"));
        assert!(result.uses_declarative_shadow_dom);
        assert!(result.html.starts_with("<x-toggle label=\"Power\">"));
        assert_contains(&result.template_html, "<template shadowrootmode=\"open\">");
        assert_contains(
            &result.template_html,
            "<style>:host { display: inline-block; }</style>",
        );
        assert_contains(&result.template_html, "part=\"root control\"");
        assert_contains(&result.template_html, "data-state=\"off\"");
        assert_contains(&result.template_html, "aria-pressed=\"false\"");
        assert_contains(&result.template_html, "<slot data-iktia-node=");
        assert_contains(&result.template_html, "data-iktia-root=\"\"");
        assert_contains(&result.template_html, "data-iktia-node=\"node0\"");
        assert_contains(&result.template_html, "data-iktia-text=\"text0\"");
        assert_contains(&result.template_html, "data-iktia-control=\"show\"");
        assert_contains(&result.template_html, "data-iktia-control=\"for\"");
        assert_not_contains(&result.template_html, "addEventListener");
        assert_not_contains(&result.template_html, "toggle-change");
        assert_not_contains(&result.template_html, "CustomEvent");
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

    fn assert_contains(haystack: &str, needle: &str) {
        assert!(
            haystack.contains(needle),
            "expected generated output to contain `{needle}`"
        );
    }

    fn assert_not_contains(haystack: &str, needle: &str) {
        assert!(
            !haystack.contains(needle),
            "expected generated output not to contain `{needle}`"
        );
    }

    fn occurrence_count(haystack: &str, needle: &str) -> usize {
        haystack.match_indices(needle).count()
    }

    fn section_between<'a>(haystack: &'a str, start: &str, end: &str) -> &'a str {
        let after_start = haystack
            .split_once(start)
            .unwrap_or_else(|| {
                panic!("expected generated output to contain section start `{start}`")
            })
            .1;
        after_start
            .split_once(end)
            .unwrap_or_else(|| panic!("expected generated output to contain section end `{end}`"))
            .0
    }
}
