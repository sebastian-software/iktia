//! Local compiler conformance fixtures for accepted, rejected, and DSD output.

use iktia_core::{
    DiagnosticSeverity, render_declarative_shadow_dom_module_with_inline_styles,
    transform_component_module,
};

struct AcceptedFixture {
    filename: &'static str,
    source: &'static str,
    snippets: &'static [&'static str],
}

struct RejectedFixture {
    filename: &'static str,
    source: &'static str,
    code: &'static str,
    message: &'static str,
    hint: &'static str,
}

struct DsdFixture {
    filename: &'static str,
    source: &'static str,
    props: Option<&'static str>,
    inline_styles: Option<&'static str>,
    snippets: &'static [&'static str],
    forbidden_snippets: &'static [&'static str],
}

const ACCEPTED_FIXTURES: &[AcceptedFixture] = &[
    AcceptedFixture {
        filename: "reactive-counter.wc.tsx",
        source: include_str!("fixtures/conformance/accepted/reactive-counter.wc.tsx"),
        snippets: &[
            "class ReactiveCounterElement extends HTMLElement",
            "customElements.define(\"reactive-counter\", ReactiveCounterElement)",
            "static get observedAttributes()",
            "this.#computedCache.set(\"doubled\", (count() * 2));",
            "this.#scheduleFlush();",
            "#effectCleanups = [];",
            "new CustomEvent(\"change\"",
            "setAttribute(\"data-count\"",
            "setAttribute(\"part\", \"button\")",
        ],
    },
    AcceptedFixture {
        filename: "composition-toggle-list.wc.tsx",
        source: include_str!("fixtures/conformance/accepted/composition-toggle-list.wc.tsx"),
        snippets: &[
            "class CompositionToggleListElement extends HTMLElement",
            "customElements.define(\"composition-toggle-list\", CompositionToggleListElement)",
            "const host = () => ({",
            "addEventListener(\"click\"",
            "data-iktia-control\", \"show",
            "data-iktia-control\", \"for",
            ".replaceChildren(",
            "setAttribute(\"aria-pressed\"",
        ],
    },
    AcceptedFixture {
        filename: "styled-slots.wc.tsx",
        source: include_str!("fixtures/conformance/accepted/styled-slots.wc.tsx"),
        snippets: &[
            "import css from \"./styled-slots.css?inline\";",
            "class StyledSlotsElement extends HTMLElement",
            "customElements.define(\"styled-slots\", StyledSlotsElement)",
            "style.textContent",
            "[css].join(\"\\n\")",
            "document.createElement(\"slot\")",
            "setAttribute(\"name\", \"icon\")",
            "setAttribute(\"part\", \"root label\")",
        ],
    },
];

const REJECTED_FIXTURES: &[RejectedFixture] = &[
    RejectedFixture {
        filename: "removed-signal.wc.tsx",
        source: include_str!("fixtures/conformance/rejected/removed-signal.wc.tsx"),
        code: "IKTIA_REMOVED_AUTHORING_API",
        message: "signal() was removed",
        hint: "function component authoring API",
    },
    RejectedFixture {
        filename: "conditional-jsx.wc.tsx",
        source: include_str!("fixtures/conformance/rejected/conditional-jsx.wc.tsx"),
        code: "IKTIA_UNSUPPORTED_CONDITIONAL_JSX",
        message: "Use the explicit <Show",
        hint: "<Show",
    },
    RejectedFixture {
        filename: "unkeyed-map.wc.tsx",
        source: include_str!("fixtures/conformance/rejected/unkeyed-map.wc.tsx"),
        code: "IKTIA_UNSUPPORTED_LIST_RENDERER",
        message: "require a key attribute",
        hint: "keyed .map()",
    },
    RejectedFixture {
        filename: "map-block-body.wc.tsx",
        source: include_str!("fixtures/conformance/rejected/map-block-body.wc.tsx"),
        code: "IKTIA_UNSUPPORTED_LIST_RENDERER",
        message: "expression body",
        hint: "keyed .map()",
    },
    RejectedFixture {
        filename: "computed-block-body.wc.tsx",
        source: include_str!("fixtures/conformance/rejected/computed-block-body.wc.tsx"),
        code: "IKTIA_UNSUPPORTED_COMPUTED_CALLBACK",
        message: "computed() must use an expression body",
        hint: "Check the v0.1 authoring limitations",
    },
];

const DSD_FIXTURES: &[DsdFixture] = &[DsdFixture {
    filename: "snapshot-shell.wc.tsx",
    source: include_str!("fixtures/conformance/dsd/snapshot-shell.wc.tsx"),
    props: Some(r#"{"label":"Clicks"}"#),
    inline_styles: Some(r#"{"css":":host { display: block; }"}"#),
    snippets: &[
        "<snapshot-shell label=\"Clicks\">",
        "<template shadowrootmode=\"open\">",
        "<style>:host { display: block; }</style>",
        "part=\"root\"",
        "data-count=\"0\"",
        "aria-label=\"Clicks\"",
        "data-iktia-root=\"\"",
        "data-iktia-node=\"node0\"",
        "data-iktia-text=\"text0\"",
        "Clicks: 0",
    ],
    forbidden_snippets: &["addEventListener", "CustomEvent"],
}];

#[test]
fn accepted_fixtures_should_transform_through_public_compiler_boundary() {
    for fixture in ACCEPTED_FIXTURES {
        let result = transform_component_module(fixture.source, fixture.filename)
            .unwrap_or_else(|error| panic!("{} should compile: {error}", fixture.filename));

        assert!(
            result.has_changed,
            "{} should be rewritten by the compiler",
            fixture.filename
        );
        let source_map = result
            .map
            .as_ref()
            .unwrap_or_else(|| panic!("{} should emit a source map", fixture.filename));
        assert_eq!(source_map.sources, vec![fixture.filename]);
        assert_eq!(source_map.sources_content, vec![fixture.source.to_owned()]);

        for snippet in fixture.snippets {
            assert!(
                result.code.contains(snippet),
                "{} output should contain {snippet:?}\n\n{}",
                fixture.filename,
                result.code
            );
        }
    }
}

#[test]
fn rejected_fixtures_should_emit_stable_diagnostics() {
    for fixture in REJECTED_FIXTURES {
        let error = transform_component_module(fixture.source, fixture.filename)
            .expect_err("rejected fixture should not compile");
        let diagnostics = error.diagnostics(fixture.filename);
        let diagnostic = diagnostics
            .first()
            .unwrap_or_else(|| panic!("{} should emit diagnostics", fixture.filename));

        assert_eq!(diagnostic.code, fixture.code, "{}", fixture.filename);
        assert_eq!(
            diagnostic.severity,
            DiagnosticSeverity::Error,
            "{}",
            fixture.filename
        );
        assert_eq!(diagnostic.filename, fixture.filename);
        assert!(
            diagnostic.message.contains(fixture.message),
            "{} message should contain {:?}, got {:?}",
            fixture.filename,
            fixture.message,
            diagnostic.message
        );
        let hint = diagnostic
            .hint
            .as_deref()
            .unwrap_or_else(|| panic!("{} should emit a hint", fixture.filename));
        assert!(
            hint.contains(fixture.hint),
            "{} hint should contain {:?}, got {:?}",
            fixture.filename,
            fixture.hint,
            hint
        );
    }
}

#[test]
fn dsd_fixtures_should_prerender_static_shells_without_event_code() {
    for fixture in DSD_FIXTURES {
        let result = render_declarative_shadow_dom_module_with_inline_styles(
            fixture.source,
            fixture.filename,
            fixture.props,
            fixture.inline_styles,
        )
        .unwrap_or_else(|error| panic!("{} should prerender: {error}", fixture.filename));

        assert!(result.uses_declarative_shadow_dom, "{}", fixture.filename);
        assert!(result.shadow, "{}", fixture.filename);

        for snippet in fixture.snippets {
            assert!(
                result.html.contains(snippet) || result.template_html.contains(snippet),
                "{} DSD output should contain {snippet:?}\n\n{}",
                fixture.filename,
                result.html
            );
        }
        for snippet in fixture.forbidden_snippets {
            assert!(
                !result.html.contains(snippet) && !result.template_html.contains(snippet),
                "{} DSD output should not contain {snippet:?}\n\n{}",
                fixture.filename,
                result.html
            );
        }
    }
}
