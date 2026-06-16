use oxc_allocator::Allocator;
use oxc_parser::Parser;
use oxc_span::SourceType;
use regex::Regex;

use crate::error::{CompilerError, CompilerResult};
use crate::model::{
    ComponentModule, ComponentOptions, EventDefinition, PropDefinition, PropKind, StateDefinition,
};

/// Analyzes a TSX module containing a lean-wc `component()` call.
///
/// # Errors
///
/// Returns [`CompilerError`] when the source does not parse as TSX or when no
/// supported `component()` call can be found.
pub fn analyze_component_module(source: &str, filename: &str) -> CompilerResult<ComponentModule> {
    parse_with_oxc(source, filename)?;

    let component_call = extract_component_call(source, filename)?;
    let tag_name = capture_tag_name(component_call, filename)?;
    let options = capture_component_options(component_call)?;
    let callback_body = capture_callback_body(component_call)?;
    let template_source = capture_template_source(callback_body)?;

    Ok(ComponentModule {
        class_name: class_name_for_tag(&tag_name),
        tag_name,
        options,
        props: capture_props(callback_body)?,
        states: capture_states(callback_body)?,
        events: capture_events(callback_body)?,
        template_source,
    })
}

fn parse_with_oxc(source: &str, filename: &str) -> CompilerResult<()> {
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(filename).unwrap_or_else(|_| SourceType::tsx());
    let parsed = Parser::new(&allocator, source, source_type).parse();

    if parsed.errors.is_empty() {
        return Ok(());
    }

    let messages = parsed
        .errors
        .iter()
        .map(ToString::to_string)
        .collect::<Vec<_>>()
        .join(", ");

    Err(CompilerError::ParseModuleSource {
        filename: filename.to_owned(),
        messages,
    })
}

fn extract_component_call<'a>(source: &'a str, filename: &str) -> CompilerResult<&'a str> {
    let Some(start) = source.find("component(") else {
        return Err(CompilerError::ComponentNotFound {
            filename: filename.to_owned(),
        });
    };

    let open = start + "component".len();
    let end = find_matching_delimiter(source, open, '(', ')')?;
    Ok(&source[start..=end])
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

fn capture_style_expressions(component_call: &str) -> CompilerResult<Vec<String>> {
    let regex = compile_regex(r#"styles\s*:\s*\[([^\]]*)\]"#)?;
    let Some(captures) = regex.captures(component_call) else {
        return Ok(Vec::new());
    };
    let Some(styles) = captures.get(1) else {
        return Ok(Vec::new());
    };
    Ok(styles
        .as_str()
        .split(',')
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
    let Some(return_index) = callback_body.find("return") else {
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
            default_value: optional_capture(&captures, 4).unwrap_or_else(|| default_for_kind(kind)),
            kind,
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
            default_value: optional_capture(&captures, 3).unwrap_or_else(|| "\"\"".to_owned()),
            kind: PropKind::String,
        });
    }

    Ok(props)
}

fn capture_states(callback_body: &str) -> CompilerResult<Vec<StateDefinition>> {
    let regex =
        compile_regex(r#"const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*state\s*\(\s*([^)]+?)\s*\)"#)?;
    let mut states = Vec::new();
    for captures in regex.captures_iter(callback_body) {
        states.push(StateDefinition {
            local_name: capture_str(&captures, 1)?.to_owned(),
            initial_value: capture_str(&captures, 2)?.trim().to_owned(),
        });
    }
    Ok(states)
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
