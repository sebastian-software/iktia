pub(crate) fn custom_element_tag_for_component(component_name: &str) -> String {
    let tag_name = kebab_case_identifier(component_name);
    if tag_name.contains('-') {
        tag_name
    } else {
        format!("x-{tag_name}")
    }
}

pub(crate) fn is_pascal_case_identifier(identifier: &str) -> bool {
    identifier
        .chars()
        .next()
        .is_some_and(|first| first.is_ascii_uppercase())
}

pub(crate) fn kebab_case_identifier(identifier: &str) -> String {
    let chars = identifier.chars().collect::<Vec<_>>();
    let mut output = String::new();

    for (index, ch) in chars.iter().copied().enumerate() {
        if matches!(ch, '_' | ' ') {
            if !output.ends_with('-') && !output.is_empty() {
                output.push('-');
            }
            continue;
        }

        if ch.is_ascii_uppercase() && index > 0 {
            let previous = chars[index - 1];
            let next = chars.get(index + 1).copied();
            if (previous.is_ascii_lowercase() || previous.is_ascii_digit())
                || (previous.is_ascii_uppercase()
                    && next.is_some_and(|next| next.is_ascii_lowercase()))
            {
                output.push('-');
            }
        }

        output.push(ch.to_ascii_lowercase());
    }

    output
}
