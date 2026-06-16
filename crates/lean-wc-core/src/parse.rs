use regex::Regex;

use crate::ast::{
    AstComponentSemantics, AstFunctionComponent, AstModuleFacts, SourceSpan, analyze_module,
};
use crate::error::{CompilerError, CompilerResult};
use crate::model::{
    ComponentImport, ComponentModule, ComponentOptions, ComputedDefinition, EffectDefinition,
    EventDefinition, PropAccess, PropDefinition, PropKind, StateDefinition, StateKind,
};
use crate::naming::{custom_element_tag_for_component, kebab_case_identifier};

/// Analyzes a TSX module containing a lean-wc component definition.
///
/// # Errors
///
/// Returns [`CompilerError`] when the source does not parse as TSX or when no
/// supported function component or `component()` call can be found.
pub fn analyze_component_module(source: &str, filename: &str) -> CompilerResult<ComponentModule> {
    let ast_facts = analyze_module(source, filename)?;

    let component_imports = ast_facts.component_imports.clone();
    if let Some(function_component) = capture_function_component(source, &ast_facts)? {
        return analyze_function_component(source, function_component, component_imports);
    }

    let component_call = extract_component_call(source, filename, &ast_facts)?;
    let tag_name = capture_tag_name(component_call, filename)?;
    let options = capture_component_options(component_call)?;
    let callback_body = capture_callback_body(component_call)?;
    let ast_semantics = ast_facts
        .legacy_component
        .as_ref()
        .and_then(|component| component.semantics.clone());
    let states = match &ast_semantics {
        Some(semantics) => semantics.states.clone(),
        None => capture_states(callback_body)?,
    };
    let computed = match &ast_semantics {
        Some(semantics) => semantics.computed.clone(),
        None => capture_computed(callback_body)?,
    };
    let effects = match &ast_semantics {
        Some(semantics) => semantics.effects.clone(),
        None => capture_effects(callback_body)?,
    };
    let uses_host_helpers = match &ast_semantics {
        Some(semantics) => semantics.uses_host_helpers,
        None => captures_host_helpers(callback_body)?,
    };
    let events = match &ast_semantics {
        Some(semantics) => semantics.events.clone(),
        None => capture_events(callback_body)?,
    };
    let template_source = match ast_semantics {
        Some(semantics) => semantics
            .template_source
            .ok_or_else(|| unsupported("component() callback must return a TSX template."))?,
        None => capture_template_source(callback_body)?,
    };

    Ok(ComponentModule {
        class_name: class_name_for_tag(&tag_name),
        tag_name,
        export_name: None,
        options,
        component_imports,
        props: capture_props(callback_body)?,
        states,
        computed,
        effects,
        uses_host_helpers,
        events,
        template_source,
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
        props: capture_function_props(function_component.params)?,
        states: function_component.semantics.states,
        computed: function_component.semantics.computed,
        effects: function_component.semantics.effects,
        uses_host_helpers: function_component.semantics.uses_host_helpers,
        events: function_component.semantics.events,
        template_source: function_component
            .semantics
            .template_source
            .ok_or_else(|| unsupported("component() callback must return a TSX template."))?,
    })
}

fn extract_component_call<'a>(
    source: &'a str,
    filename: &str,
    ast_facts: &AstModuleFacts,
) -> CompilerResult<&'a str> {
    let Some(component) = &ast_facts.legacy_component else {
        return Err(CompilerError::ComponentNotFound {
            filename: filename.to_owned(),
        });
    };

    source_span(source, component.call)
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

fn capture_tag_name(component_call: &str, filename: &str) -> CompilerResult<String> {
    let regex = compile_regex(r#"component\s*\(\s*"([^"]+)""#)?;
    let Some(captures) = regex.captures(component_call) else {
        return Err(CompilerError::ComponentNotFound {
            filename: filename.to_owned(),
        });
    };
    let Some(tag_name) = captures.get(1) else {
        return Err(CompilerError::ComponentNotFound {
            filename: filename.to_owned(),
        });
    };
    Ok(tag_name.as_str().to_owned())
}

fn capture_component_options(component_call: &str) -> CompilerResult<ComponentOptions> {
    Ok(ComponentOptions {
        shadow: !component_call.contains("shadow: false"),
        define: !component_call.contains("define: false"),
        styles: capture_style_expressions(component_call)?,
    })
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

fn capture_callback_body(component_call: &str) -> CompilerResult<&str> {
    let Some(arrow_index) = component_call.find("=>") else {
        return Err(unsupported(
            "component() requires an arrow function callback.",
        ));
    };
    let after_arrow = &component_call[arrow_index + 2..];
    let Some(relative_open) = after_arrow.find('{') else {
        return Err(unsupported(
            "component() callback must use a block body in the current compiler milestone.",
        ));
    };
    let open = arrow_index + 2 + relative_open;
    let close = find_matching_delimiter(component_call, open, '{', '}')?;
    Ok(&component_call[open + 1..close])
}

fn capture_template_source(callback_body: &str) -> CompilerResult<String> {
    let Some(return_index) = find_top_level_keyword(callback_body, "return") else {
        return Err(unsupported(
            "component() callback must return a TSX template.",
        ));
    };
    let after_return = &callback_body[return_index + "return".len()..];
    let Some(relative_open) = after_return.find('(') else {
        return Err(unsupported(
            "component() return value must be wrapped in parentheses.",
        ));
    };
    let open = return_index + "return".len() + relative_open;
    let close = find_matching_delimiter(callback_body, open, '(', ')')?;
    Ok(callback_body[open + 1..close].trim().to_owned())
}

fn find_top_level_keyword(source: &str, keyword: &str) -> Option<usize> {
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
            continue;
        }

        if matches!(ch, ')' | ']' | '}') {
            depth = depth.saturating_sub(1);
            continue;
        }

        if depth == 0 && source[index..].starts_with(keyword) {
            let before = source[..index].chars().next_back();
            let after = source[index + keyword.len()..].chars().next();
            if !before.is_some_and(is_identifier_char) && !after.is_some_and(is_identifier_char) {
                return Some(index);
            }
        }
    }

    None
}

fn is_identifier_char(ch: char) -> bool {
    ch.is_ascii_alphanumeric() || matches!(ch, '_' | '$')
}

fn capture_props(callback_body: &str) -> CompilerResult<Vec<PropDefinition>> {
    let typed_regex = compile_regex(
        r#"const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*prop\.(string|boolean|number)\s*\(\s*"([^"]+)"\s*(?:,\s*([^)]+?))?\s*\)"#,
    )?;
    let generic_regex = compile_regex(
        r#"const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*prop(?:<[^>]+>)?\s*\(\s*"([^"]+)"\s*(?:,\s*([^)]+?))?\s*\)"#,
    )?;

    let mut props = Vec::new();
    for captures in typed_regex.captures_iter(callback_body) {
        let kind = match capture_str(&captures, 2)? {
            "boolean" => PropKind::Boolean,
            "number" => PropKind::Number,
            _ => PropKind::String,
        };
        props.push(PropDefinition {
            local_name: capture_str(&captures, 1)?.to_owned(),
            prop_name: capture_str(&captures, 3)?.to_owned(),
            attribute_name: capture_str(&captures, 3)?.to_owned(),
            default_value: optional_capture(&captures, 4).unwrap_or_else(|| default_for_kind(kind)),
            kind,
            access: PropAccess::Accessor,
        });
    }

    for captures in generic_regex.captures_iter(callback_body) {
        let local_name = capture_str(&captures, 1)?;
        if props.iter().any(|prop| prop.local_name == local_name) {
            continue;
        }
        props.push(PropDefinition {
            local_name: local_name.to_owned(),
            prop_name: capture_str(&captures, 2)?.to_owned(),
            attribute_name: capture_str(&captures, 2)?.to_owned(),
            default_value: optional_capture(&captures, 3).unwrap_or_else(|| "\"\"".to_owned()),
            kind: PropKind::String,
            access: PropAccess::Accessor,
        });
    }

    Ok(props)
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
            return Err(unsupported(
                "Function component rest props are not supported in the current compiler milestone.",
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
        return Err(unsupported(
            "Function component prop binding must have a name.",
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

fn capture_states(callback_body: &str) -> CompilerResult<Vec<StateDefinition>> {
    let regex = compile_regex(
        r#"const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(state|signal)\s*\(\s*([^)]+?)\s*\)"#,
    )?;
    let mut states = Vec::new();
    for captures in regex.captures_iter(callback_body) {
        let kind = match capture_str(&captures, 2)? {
            "signal" => StateKind::Signal,
            _ => StateKind::State,
        };
        states.push(StateDefinition {
            local_name: capture_str(&captures, 1)?.to_owned(),
            initial_value: capture_str(&captures, 3)?.trim().to_owned(),
            kind,
        });
    }
    Ok(states)
}

fn capture_computed(callback_body: &str) -> CompilerResult<Vec<ComputedDefinition>> {
    let calls = capture_const_calls(callback_body, "computed")?;
    calls
        .into_iter()
        .map(|call| {
            Ok(ComputedDefinition {
                local_name: call.local_name,
                expression: capture_arrow_expression(&call.arguments)?,
            })
        })
        .collect()
}

fn capture_effects(callback_body: &str) -> CompilerResult<Vec<EffectDefinition>> {
    let mut effects = Vec::new();
    for call in capture_calls(callback_body, "effect")? {
        effects.push(EffectDefinition {
            body: capture_arrow_body(&call.arguments)?,
        });
    }
    Ok(effects)
}

fn captures_host_helpers(callback_body: &str) -> CompilerResult<bool> {
    let regex = compile_regex(r#"\b(?:host|useHost)\s*\("#)?;
    Ok(regex.is_match(callback_body))
}

fn capture_events(callback_body: &str) -> CompilerResult<Vec<EventDefinition>> {
    let regex = compile_regex(
        r#"const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*event(?:<([^>]*)>)?\s*\(\s*"([^"]+)""#,
    )?;
    let mut events = Vec::new();
    for captures in regex.captures_iter(callback_body) {
        events.push(EventDefinition {
            local_name: capture_str(&captures, 1)?.to_owned(),
            detail_type: optional_capture(&captures, 2).map(|value| value.trim().to_owned()),
            event_name: capture_str(&captures, 3)?.to_owned(),
        });
    }
    Ok(events)
}

struct ConstCall {
    local_name: String,
    arguments: String,
}

struct Call {
    arguments: String,
}

fn capture_const_calls(callback_body: &str, function_name: &str) -> CompilerResult<Vec<ConstCall>> {
    let pattern = format!(
        r#"const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*{}\s*\("#,
        regex::escape(function_name)
    );
    let regex = Regex::new(&pattern).map_err(|source| CompilerError::InternalPattern {
        pattern: "dynamic const call pattern",
        source,
    })?;
    let mut calls = Vec::new();
    for captures in regex.captures_iter(callback_body) {
        let Some(full_match) = captures.get(0) else {
            continue;
        };
        let open = full_match.end() - 1;
        let close = find_matching_delimiter(callback_body, open, '(', ')')?;
        calls.push(ConstCall {
            local_name: capture_str(&captures, 1)?.to_owned(),
            arguments: callback_body[open + 1..close].trim().to_owned(),
        });
    }
    Ok(calls)
}

fn capture_calls(callback_body: &str, function_name: &str) -> CompilerResult<Vec<Call>> {
    let pattern = format!(r#"\b{}\s*\("#, regex::escape(function_name));
    let regex = Regex::new(&pattern).map_err(|source| CompilerError::InternalPattern {
        pattern: "dynamic call pattern",
        source,
    })?;
    let mut calls = Vec::new();
    for full_match in regex.find_iter(callback_body) {
        let open = full_match.end() - 1;
        let close = find_matching_delimiter(callback_body, open, '(', ')')?;
        calls.push(Call {
            arguments: callback_body[open + 1..close].trim().to_owned(),
        });
    }
    Ok(calls)
}

fn capture_arrow_expression(arguments: &str) -> CompilerResult<String> {
    let Some(arrow_index) = arguments.find("=>") else {
        return Err(unsupported(
            "computed() requires an arrow function callback.",
        ));
    };
    let body = arguments[arrow_index + 2..].trim();
    if body.starts_with('{') {
        return Err(unsupported(
            "computed() must use an expression body in the current compiler milestone.",
        ));
    }
    Ok(body.to_owned())
}

fn capture_arrow_body(arguments: &str) -> CompilerResult<String> {
    let Some(arrow_index) = arguments.find("=>") else {
        return Err(unsupported("effect() requires an arrow function callback."));
    };
    let body = arguments[arrow_index + 2..].trim();
    if body.starts_with('{') {
        if !body.ends_with('}') || body.len() < 2 {
            return Err(unsupported("effect() callback body is malformed."));
        }
        return Ok(body[1..body.len() - 1].trim().to_owned());
    }
    Ok(format!("return {body};"))
}

fn capture_str<'a>(captures: &'a regex::Captures<'_>, index: usize) -> CompilerResult<&'a str> {
    captures
        .get(index)
        .map(|capture| capture.as_str())
        .ok_or_else(|| unsupported("compiler capture was unexpectedly missing"))
}

fn optional_capture(captures: &regex::Captures<'_>, index: usize) -> Option<String> {
    captures
        .get(index)
        .map(|capture| capture.as_str().trim().to_owned())
        .filter(|value| !value.is_empty())
}

fn default_for_kind(kind: PropKind) -> String {
    match kind {
        PropKind::String => "\"\"".to_owned(),
        PropKind::Boolean => "false".to_owned(),
        PropKind::Number => "0".to_owned(),
    }
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

fn class_name_for_tag(tag_name: &str) -> String {
    tag_name
        .split('-')
        .filter(|part| !part.is_empty())
        .map(capitalize_ascii)
        .collect::<String>()
}

fn capitalize_ascii(part: &str) -> String {
    let mut chars = part.chars();
    let Some(first) = chars.next() else {
        return String::new();
    };
    let mut output = first.to_ascii_uppercase().to_string();
    output.extend(chars);
    output
}

fn compile_regex(pattern: &'static str) -> CompilerResult<Regex> {
    Regex::new(pattern).map_err(|source| CompilerError::InternalPattern { pattern, source })
}

fn unsupported(message: impl Into<String>) -> CompilerError {
    CompilerError::Unsupported {
        message: message.into(),
    }
}
