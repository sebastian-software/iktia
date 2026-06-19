use crate::ast::{
    AstComponentSemantics, AstFunctionComponent, AstModuleFacts, SourceSpan, analyze_module,
};
use crate::error::{
    CompilerError, CompilerResult, DIAGNOSTIC_CODE_COMPONENT_TEMPLATE_REQUIRED,
    DIAGNOSTIC_CODE_UNSUPPORTED_COMPONENT_OPTIONS, DIAGNOSTIC_CODE_UNSUPPORTED_FUNCTION_PROPS,
    DIAGNOSTIC_HINT_COMPONENT_OPTIONS, DIAGNOSTIC_HINT_FUNCTION_COMPONENT,
    DIAGNOSTIC_HINT_FUNCTION_PROPS, removed_authoring_api, unsupported, unsupported_with_code,
};
use crate::model::{
    ComponentImport, ComponentModule, ComponentOptions, PropAccess, PropDefinition, PropKind,
    RuntimeImport, StyleImport,
};
use crate::naming::{custom_element_tag_for_component, kebab_case_identifier};

/// Analyzes a TSX module containing an Iktia component definition.
///
/// # Errors
///
/// Returns [`CompilerError`] when the source does not parse as TSX or when no
/// supported PascalCase function component can be found.
pub fn analyze_component_module(source: &str, filename: &str) -> CompilerResult<ComponentModule> {
    let ast_facts = analyze_module(source, filename)?;

    let component_imports = ast_facts.component_imports.clone();
    let runtime_imports = ast_facts.runtime_imports.clone();
    let style_imports = ast_facts.style_imports.clone();
    if let Some(function_component) = capture_function_component(source, &ast_facts)? {
        return analyze_function_component(
            source,
            function_component,
            component_imports,
            runtime_imports,
            style_imports,
        );
    }

    reject_removed_module_apis(source)?;
    Err(CompilerError::ComponentNotFound {
        filename: filename.to_owned(),
    })
}

struct FunctionComponent<'a> {
    name: String,
    params: &'a str,
    semantics: AstComponentSemantics,
}

fn analyze_function_component(
    source: &str,
    function_component: FunctionComponent<'_>,
    component_imports: Vec<ComponentImport>,
    runtime_imports: Vec<RuntimeImport>,
    style_imports: Vec<StyleImport>,
) -> CompilerResult<ComponentModule> {
    let tag_name = custom_element_tag_for_component(&function_component.name);
    let class_name = format!("{}Element", function_component.name);
    let options = capture_exported_component_options(source)?;

    Ok(ComponentModule {
        class_name,
        tag_name,
        export_name: Some(function_component.name),
        options,
        component_imports,
        runtime_imports,
        style_imports,
        props: capture_function_props(function_component.params)?,
        states: function_component.semantics.states,
        form_controls: function_component.semantics.form_controls,
        computed: function_component.semantics.computed,
        keyed_selectors: function_component.semantics.keyed_selectors,
        effects: function_component.semantics.effects,
        connected_callbacks: function_component.semantics.connected_callbacks,
        disconnected_callbacks: function_component.semantics.disconnected_callbacks,
        uses_host_helpers: function_component.semantics.uses_host_helpers,
        events: function_component.semantics.events,
        template_source: function_component
            .semantics
            .template_source
            .ok_or_else(|| {
                unsupported_with_code(
                    DIAGNOSTIC_CODE_COMPONENT_TEMPLATE_REQUIRED,
                    "Function components must return a TSX template.",
                    DIAGNOSTIC_HINT_FUNCTION_COMPONENT,
                )
            })?,
    })
}

fn capture_function_component<'a>(
    source: &'a str,
    ast_facts: &AstModuleFacts,
) -> CompilerResult<Option<FunctionComponent<'a>>> {
    if let Some(component) = ast_facts.function_components.first() {
        return Ok(Some(FunctionComponent {
            name: component.name.clone(),
            params: function_params_source(source, component)?,
            semantics: component.semantics.clone(),
        }));
    }

    Ok(None)
}

fn function_params_source<'a>(
    source: &'a str,
    component: &AstFunctionComponent,
) -> CompilerResult<&'a str> {
    let params = source_span(source, component.params)?.trim();
    Ok(strip_optional_delimiters(params, '(', ')'))
}

fn source_span(source: &str, span: SourceSpan) -> CompilerResult<&str> {
    source
        .get(span.start..span.end)
        .ok_or_else(|| unsupported("OXC AST span did not align with source text."))
}

fn strip_optional_delimiters(source: &str, open: char, close: char) -> &str {
    let trimmed = source.trim();
    if trimmed.starts_with(open) && trimmed.ends_with(close) {
        return trimmed[open.len_utf8()..trimmed.len() - close.len_utf8()].trim();
    }
    trimmed
}

fn capture_component_options(component_call: &str) -> CompilerResult<ComponentOptions> {
    for property in
        split_top_level_commas(strip_optional_delimiters(component_call.trim(), '{', '}'))
    {
        if starts_with_property_key(property, "shadow")
            || starts_with_property_key(property, "define")
        {
            return Err(unsupported_with_code(
                DIAGNOSTIC_CODE_UNSUPPORTED_COMPONENT_OPTIONS,
                "Component options only support `styles` in the public v0.1 API.",
                DIAGNOSTIC_HINT_COMPONENT_OPTIONS,
            ));
        }
    }

    Ok(ComponentOptions {
        shadow: true,
        define: true,
        styles: capture_style_expressions(component_call)?,
    })
}

fn starts_with_property_key(source: &str, key: &str) -> bool {
    let trimmed = source.trim_start();
    if let Some(rest) = trimmed.strip_prefix(key) {
        return rest.trim_start().starts_with(':');
    }

    for quote in ['"', '\''] {
        let Some(after_quote) = trimmed.strip_prefix(quote) else {
            continue;
        };
        let Some(rest) = after_quote.strip_prefix(key) else {
            continue;
        };
        let Some(rest) = rest.strip_prefix(quote) else {
            continue;
        };

        return rest.trim_start().starts_with(':');
    }

    false
}

fn capture_exported_component_options(source: &str) -> CompilerResult<ComponentOptions> {
    let Some(options_start) = source.find("export const options") else {
        return Ok(ComponentOptions::default());
    };
    let after_options = &source[options_start..];
    let Some(open_relative) = after_options.find('{') else {
        return Ok(ComponentOptions::default());
    };
    let open = options_start + open_relative;
    let close = find_matching_delimiter(source, open, '{', '}')?;
    capture_component_options(&source[open..=close])
}

fn capture_style_expressions(component_call: &str) -> CompilerResult<Vec<String>> {
    let Some(styles_index) = component_call.find("styles") else {
        return Ok(Vec::new());
    };
    let after_styles = &component_call[styles_index..];
    let Some(open_relative) = after_styles.find('[') else {
        return Ok(Vec::new());
    };
    let open = styles_index + open_relative;
    let close = find_matching_delimiter(component_call, open, '[', ']')?;
    Ok(split_top_level_commas(&component_call[open + 1..close])
        .into_iter()
        .map(str::trim)
        .filter(|style| !style.is_empty())
        .map(ToOwned::to_owned)
        .collect())
}

fn capture_function_props(params: &str) -> CompilerResult<Vec<PropDefinition>> {
    let Some(open) = params.find('{') else {
        return Ok(Vec::new());
    };
    let close = find_matching_delimiter(params, open, '{', '}')?;
    let destructured = &params[open + 1..close];
    let mut props = Vec::new();

    for prop_source in split_top_level_commas(destructured) {
        let prop_source = prop_source.trim();
        if prop_source.is_empty() {
            continue;
        }
        if prop_source.starts_with("...") {
            return Err(unsupported_with_code(
                DIAGNOSTIC_CODE_UNSUPPORTED_FUNCTION_PROPS,
                "Function component rest props are not supported in the current compiler milestone.",
                DIAGNOSTIC_HINT_FUNCTION_PROPS,
            ));
        }
        props.push(parse_function_prop(prop_source)?);
    }

    Ok(props)
}

fn parse_function_prop(prop_source: &str) -> CompilerResult<PropDefinition> {
    let (binding_source, default_value) = prop_source
        .split_once('=')
        .map(|(binding, default_value)| (binding.trim(), default_value.trim()))
        .unwrap_or((prop_source.trim(), ""));
    let (prop_name_source, local_name_source) = binding_source
        .split_once(':')
        .map(|(prop_name, local_name)| (prop_name.trim(), local_name.trim()))
        .unwrap_or((binding_source, binding_source));
    let local_name = local_name_source
        .split_whitespace()
        .next()
        .ok_or_else(|| unsupported("Function component prop binding is missing a local name."))?;

    if local_name.is_empty() || prop_name_source.is_empty() {
        return Err(unsupported_with_code(
            DIAGNOSTIC_CODE_UNSUPPORTED_FUNCTION_PROPS,
            "Function component prop binding must have a name.",
            DIAGNOSTIC_HINT_FUNCTION_PROPS,
        ));
    }

    let kind = prop_kind_for_default(default_value);
    Ok(PropDefinition {
        local_name: local_name.to_owned(),
        prop_name: prop_name_source.to_owned(),
        attribute_name: kebab_case_identifier(prop_name_source),
        kind,
        default_value: if default_value.is_empty() {
            default_for_kind(kind)
        } else {
            default_value.to_owned()
        },
        access: PropAccess::Value,
    })
}

fn split_top_level_commas(source: &str) -> Vec<&str> {
    let mut parts = Vec::new();
    let mut start = 0usize;
    let mut depth = 0usize;
    let mut in_string: Option<char> = None;
    let mut escaped = false;

    for (index, ch) in source.char_indices() {
        if let Some(quote) = in_string {
            if escaped {
                escaped = false;
                continue;
            }
            if ch == '\\' {
                escaped = true;
                continue;
            }
            if ch == quote {
                in_string = None;
            }
            continue;
        }

        if matches!(ch, '"' | '\'' | '`') {
            in_string = Some(ch);
            continue;
        }

        if matches!(ch, '(' | '[' | '{') {
            depth += 1;
        } else if matches!(ch, ')' | ']' | '}') {
            depth = depth.saturating_sub(1);
        } else if ch == ',' && depth == 0 {
            parts.push(&source[start..index]);
            start = index + ch.len_utf8();
        }
    }

    if start <= source.len() {
        parts.push(&source[start..]);
    }
    parts
}

fn prop_kind_for_default(default_value: &str) -> PropKind {
    let trimmed = default_value.trim();
    if matches!(trimmed, "true" | "false") {
        PropKind::Boolean
    } else if trimmed.parse::<f64>().is_ok() {
        PropKind::Number
    } else {
        PropKind::String
    }
}

fn default_for_kind(kind: PropKind) -> String {
    match kind {
        PropKind::String => "\"\"".to_owned(),
        PropKind::Boolean => "false".to_owned(),
        PropKind::Number => "0".to_owned(),
    }
}

fn reject_removed_module_apis(source: &str) -> CompilerResult<()> {
    if contains_call(source, "component") {
        return Err(removed_authoring_api(
            "component() was removed from the v0.1 authoring API. Export a PascalCase function component instead.",
        ));
    }
    if contains_prop_call(source) {
        return Err(removed_authoring_api(
            "prop.*() and prop() were removed from the v0.1 authoring API. Declare props with typed function parameters instead.",
        ));
    }
    if contains_call(source, "signal") {
        return Err(removed_authoring_api(
            "signal() was removed from the v0.1 authoring API. Use state() for local component state.",
        ));
    }
    if contains_call(source, "useHost") {
        return Err(removed_authoring_api(
            "useHost() was removed from the v0.1 authoring API. Use host() instead.",
        ));
    }
    Ok(())
}

fn contains_call(source: &str, name: &str) -> bool {
    let mut offset = 0;
    while let Some(relative_index) = source[offset..].find(name) {
        let index = offset + relative_index;
        let before = source[..index].chars().next_back();
        let after_name = index + name.len();
        let after = source[after_name..].chars().next();
        if !before.is_some_and(is_identifier_char) && !after.is_some_and(is_identifier_char) {
            let rest = source[after_name..].trim_start();
            if rest.starts_with('(') {
                return true;
            }
        }
        offset = after_name;
    }
    false
}

fn contains_prop_call(source: &str) -> bool {
    contains_call(source, "prop") || source.contains("prop.")
}

fn is_identifier_char(ch: char) -> bool {
    ch.is_ascii_alphanumeric() || matches!(ch, '_' | '$')
}

fn find_matching_delimiter(
    source: &str,
    open_index: usize,
    open: char,
    close: char,
) -> CompilerResult<usize> {
    let mut depth = 0usize;
    let mut in_string: Option<char> = None;
    let mut escaped = false;

    for (offset, ch) in source[open_index..].char_indices() {
        let absolute = open_index + offset;
        if let Some(string_quote) = in_string {
            if escaped {
                escaped = false;
                continue;
            }
            if ch == '\\' {
                escaped = true;
                continue;
            }
            if ch == string_quote {
                in_string = None;
            }
            continue;
        }

        if matches!(ch, '"' | '\'' | '`') {
            in_string = Some(ch);
            continue;
        }

        if ch == open {
            depth += 1;
        } else if ch == close {
            depth = depth.saturating_sub(1);
            if depth == 0 {
                return Ok(absolute);
            }
        }
    }

    Err(unsupported("source contains an unmatched delimiter."))
}
