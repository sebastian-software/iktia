use std::fmt::Write as _;

use crate::error::{CompilerError, CompilerResult};
use crate::model::{
    ComponentModule, EventDefinition, PropDefinition, PropKind, StateDefinition, TransformResult,
};
use crate::parse::analyze_component_module;

/// Transforms a TSX module into a native Custom Element JavaScript module.
///
/// # Errors
///
/// Returns [`CompilerError`] when analysis fails or the TSX template uses a
/// pattern outside the current compiler milestone.
pub fn transform_component_module(source: &str, filename: &str) -> CompilerResult<TransformResult> {
    let module = analyze_component_module(source, filename)?;
    let template = TemplateParser::new(&module.template_source).parse_element()?;
    let mut generator = CodeGenerator::new(&module);
    let code = generator.generate(&template)?;
    Ok(TransformResult {
        code,
        has_changed: true,
    })
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct TemplateElement {
    tag_name: String,
    attributes: Vec<TemplateAttribute>,
    children: Vec<TemplateChild>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct TemplateAttribute {
    name: String,
    value: AttributeValue,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum AttributeValue {
    Static(String),
    Expression(String),
    Boolean,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum TemplateChild {
    Element(TemplateElement),
    Text(String),
}

struct TemplateParser<'a> {
    input: &'a str,
    position: usize,
}

impl<'a> TemplateParser<'a> {
    const fn new(input: &'a str) -> Self {
        Self { input, position: 0 }
    }

    fn parse_element(&mut self) -> CompilerResult<TemplateElement> {
        self.skip_whitespace();
        self.expect_char('<')?;
        if self.peek_char() == Some('/') {
            return Err(unsupported("Unexpected closing tag in TSX template."));
        }

        let tag_name = self.parse_name()?;
        let mut attributes = Vec::new();

        loop {
            self.skip_whitespace();
            if self.starts_with("/>") {
                self.position += 2;
                return Ok(TemplateElement {
                    tag_name,
                    attributes,
                    children: Vec::new(),
                });
            }
            if self.consume_char('>') {
                break;
            }
            attributes.push(self.parse_attribute()?);
        }

        let mut children = Vec::new();
        loop {
            if self.starts_with("</") {
                self.position += 2;
                let close_name = self.parse_name()?;
                if close_name != tag_name {
                    return Err(unsupported(format!(
                        "Mismatched closing tag. Expected </{tag_name}> but found </{close_name}>."
                    )));
                }
                self.skip_whitespace();
                self.expect_char('>')?;
                break;
            }
            if self.is_eof() {
                return Err(unsupported(format!(
                    "Missing closing tag for <{tag_name}> in TSX template."
                )));
            }
            if self.peek_char() == Some('<') {
                children.push(TemplateChild::Element(self.parse_element()?));
            } else {
                children.push(TemplateChild::Text(self.parse_text()));
            }
        }

        Ok(TemplateElement {
            tag_name,
            attributes,
            children,
        })
    }

    fn parse_attribute(&mut self) -> CompilerResult<TemplateAttribute> {
        let name = self.parse_name()?;
        self.skip_whitespace();
        if !self.consume_char('=') {
            return Ok(TemplateAttribute {
                name,
                value: AttributeValue::Boolean,
            });
        }
        self.skip_whitespace();
        let value = match self.peek_char() {
            Some('"') | Some('\'') => AttributeValue::Static(self.parse_quoted_string()?),
            Some('{') => AttributeValue::Expression(self.parse_braced_expression()?),
            _ => {
                return Err(unsupported(format!(
                    "Attribute `{name}` must use a quoted or braced value."
                )));
            }
        };
        Ok(TemplateAttribute { name, value })
    }

    fn parse_text(&mut self) -> String {
        let start = self.position;
        while let Some(ch) = self.peek_char() {
            if ch == '<' {
                break;
            }
            self.position += ch.len_utf8();
        }
        self.input[start..self.position].to_owned()
    }

    fn parse_name(&mut self) -> CompilerResult<String> {
        let start = self.position;
        while let Some(ch) = self.peek_char() {
            if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | ':' | '$') {
                self.position += ch.len_utf8();
            } else {
                break;
            }
        }
        if start == self.position {
            return Err(unsupported("Expected a tag or attribute name."));
        }
        Ok(self.input[start..self.position].to_owned())
    }

    fn parse_quoted_string(&mut self) -> CompilerResult<String> {
        let Some(quote) = self.peek_char() else {
            return Err(unsupported("Expected a quoted string."));
        };
        self.position += quote.len_utf8();
        let start = self.position;
        while let Some(ch) = self.peek_char() {
            if ch == quote {
                let value = self.input[start..self.position].to_owned();
                self.position += quote.len_utf8();
                return Ok(value);
            }
            self.position += ch.len_utf8();
        }
        Err(unsupported("Unterminated quoted attribute value."))
    }

    fn parse_braced_expression(&mut self) -> CompilerResult<String> {
        self.expect_char('{')?;
        let start = self.position;
        let mut depth = 1usize;
        let mut in_string: Option<char> = None;
        let mut escaped = false;

        while let Some(ch) = self.peek_char() {
            if let Some(quote) = in_string {
                self.position += ch.len_utf8();
                if escaped {
                    escaped = false;
                } else if ch == '\\' {
                    escaped = true;
                } else if ch == quote {
                    in_string = None;
                }
                continue;
            }

            if matches!(ch, '"' | '\'' | '`') {
                in_string = Some(ch);
                self.position += ch.len_utf8();
                continue;
            }

            if ch == '{' {
                depth += 1;
            } else if ch == '}' {
                depth = depth.saturating_sub(1);
                if depth == 0 {
                    let expression = self.input[start..self.position].trim().to_owned();
                    self.position += ch.len_utf8();
                    return Ok(expression);
                }
            }
            self.position += ch.len_utf8();
        }

        Err(unsupported("Unterminated braced TSX expression."))
    }

    fn expect_char(&mut self, expected: char) -> CompilerResult<()> {
        if self.consume_char(expected) {
            Ok(())
        } else {
            Err(unsupported(format!(
                "Expected `{expected}` in TSX template."
            )))
        }
    }

    fn consume_char(&mut self, expected: char) -> bool {
        if self.peek_char() == Some(expected) {
            self.position += expected.len_utf8();
            true
        } else {
            false
        }
    }

    fn skip_whitespace(&mut self) {
        while let Some(ch) = self.peek_char() {
            if !ch.is_whitespace() {
                break;
            }
            self.position += ch.len_utf8();
        }
    }

    fn starts_with(&self, value: &str) -> bool {
        self.input[self.position..].starts_with(value)
    }

    fn peek_char(&self) -> Option<char> {
        self.input[self.position..].chars().next()
    }

    fn is_eof(&self) -> bool {
        self.position >= self.input.len()
    }
}

struct CodeGenerator<'a> {
    module: &'a ComponentModule,
    next_node_index: usize,
    next_text_index: usize,
    node_fields: Vec<String>,
    text_fields: Vec<String>,
    mount_lines: Vec<String>,
    update_lines: Vec<String>,
}

impl<'a> CodeGenerator<'a> {
    fn new(module: &'a ComponentModule) -> Self {
        Self {
            module,
            next_node_index: 0,
            next_text_index: 0,
            node_fields: Vec::new(),
            text_fields: Vec::new(),
            mount_lines: Vec::new(),
            update_lines: Vec::new(),
        }
    }

    fn generate(&mut self, root: &TemplateElement) -> CompilerResult<String> {
        let root_variable = self.emit_element(root)?;
        self.mount_lines
            .push(format!("this.#root.append({root_variable});"));

        let mut code = String::new();
        writeln!(
            code,
            "class {} extends HTMLElement {{",
            self.module.class_name
        )
        .map_err(format_error)?;
        self.emit_observed_attributes(&mut code)?;
        self.emit_fields(&mut code)?;
        self.emit_constructor(&mut code)?;
        self.emit_lifecycle(&mut code)?;
        self.emit_prop_accessors(&mut code)?;
        self.emit_mount(&mut code)?;
        self.emit_bindings(&mut code)?;
        self.emit_update(&mut code)?;
        writeln!(code, "}}").map_err(format_error)?;
        self.emit_exports(&mut code)?;
        Ok(code)
    }

    fn emit_observed_attributes(&self, code: &mut String) -> CompilerResult<()> {
        let attributes = self
            .module
            .props
            .iter()
            .map(|prop| format!("\"{}\"", prop.prop_name))
            .collect::<Vec<_>>()
            .join(", ");
        writeln!(code, "  static get observedAttributes() {{").map_err(format_error)?;
        writeln!(code, "    return [{attributes}];").map_err(format_error)?;
        writeln!(code, "  }}").map_err(format_error)?;
        Ok(())
    }

    fn emit_fields(&self, code: &mut String) -> CompilerResult<()> {
        writeln!(code, "  #root;").map_err(format_error)?;
        writeln!(code, "  #mounted = false;").map_err(format_error)?;
        writeln!(code, "  #props = {{").map_err(format_error)?;
        for prop in &self.module.props {
            writeln!(
                code,
                "    {}: {},",
                prop.local_name,
                default_value_for_prop(prop)
            )
            .map_err(format_error)?;
        }
        writeln!(code, "  }};").map_err(format_error)?;
        writeln!(code, "  #state = {{").map_err(format_error)?;
        for state in &self.module.states {
            writeln!(code, "    {}: {},", state.local_name, state.initial_value)
                .map_err(format_error)?;
        }
        writeln!(code, "  }};").map_err(format_error)?;
        for field in &self.node_fields {
            writeln!(code, "  #{field};").map_err(format_error)?;
        }
        for field in &self.text_fields {
            writeln!(code, "  #{field};").map_err(format_error)?;
        }
        Ok(())
    }

    fn emit_constructor(&self, code: &mut String) -> CompilerResult<()> {
        writeln!(code, "  constructor() {{").map_err(format_error)?;
        writeln!(code, "    super();").map_err(format_error)?;
        if self.module.options.shadow {
            writeln!(
                code,
                "    this.#root = this.attachShadow({{ mode: \"open\" }});"
            )
            .map_err(format_error)?;
        } else {
            writeln!(code, "    this.#root = this;").map_err(format_error)?;
        }
        writeln!(code, "  }}").map_err(format_error)?;
        Ok(())
    }

    fn emit_lifecycle(&self, code: &mut String) -> CompilerResult<()> {
        writeln!(code, "  connectedCallback() {{").map_err(format_error)?;
        writeln!(code, "    if (!this.#mounted) {{").map_err(format_error)?;
        writeln!(code, "      this.#mount();").map_err(format_error)?;
        writeln!(code, "      this.#mounted = true;").map_err(format_error)?;
        writeln!(code, "    }}").map_err(format_error)?;
        writeln!(code, "    this.#update();").map_err(format_error)?;
        writeln!(code, "  }}").map_err(format_error)?;
        writeln!(
            code,
            "  attributeChangedCallback(name, oldValue, newValue) {{"
        )
        .map_err(format_error)?;
        writeln!(code, "    if (oldValue === newValue) return;").map_err(format_error)?;
        writeln!(code, "    switch (name) {{").map_err(format_error)?;
        for prop in &self.module.props {
            writeln!(code, "      case \"{}\":", prop.prop_name).map_err(format_error)?;
            writeln!(
                code,
                "        this.#props.{} = {};",
                prop.local_name,
                attr_parse_expression(prop)
            )
            .map_err(format_error)?;
            writeln!(code, "        break;").map_err(format_error)?;
        }
        writeln!(code, "    }}").map_err(format_error)?;
        writeln!(code, "    this.#update();").map_err(format_error)?;
        writeln!(code, "  }}").map_err(format_error)?;
        Ok(())
    }

    fn emit_prop_accessors(&self, code: &mut String) -> CompilerResult<()> {
        for prop in &self.module.props {
            writeln!(code, "  get {}() {{", prop.prop_name).map_err(format_error)?;
            writeln!(code, "    return this.#props.{};", prop.local_name).map_err(format_error)?;
            writeln!(code, "  }}").map_err(format_error)?;
            writeln!(code, "  set {}(value) {{", prop.prop_name).map_err(format_error)?;
            writeln!(
                code,
                "    const nextValue = {};",
                setter_parse_expression(prop)
            )
            .map_err(format_error)?;
            writeln!(code, "    this.#props.{} = nextValue;", prop.local_name)
                .map_err(format_error)?;
            self.emit_attribute_sync(code, prop)?;
            writeln!(code, "    this.#update();").map_err(format_error)?;
            writeln!(code, "  }}").map_err(format_error)?;
        }
        Ok(())
    }

    fn emit_attribute_sync(&self, code: &mut String, prop: &PropDefinition) -> CompilerResult<()> {
        match prop.kind {
            PropKind::Boolean => {
                writeln!(code, "    if (nextValue) {{").map_err(format_error)?;
                writeln!(
                    code,
                    "      this.setAttribute(\"{}\", \"\");",
                    prop.prop_name
                )
                .map_err(format_error)?;
                writeln!(code, "    }} else {{").map_err(format_error)?;
                writeln!(code, "      this.removeAttribute(\"{}\");", prop.prop_name)
                    .map_err(format_error)?;
                writeln!(code, "    }}").map_err(format_error)?;
            }
            PropKind::Number | PropKind::String => {
                writeln!(
                    code,
                    "    if (this.getAttribute(\"{}\") !== String(nextValue)) {{",
                    prop.prop_name
                )
                .map_err(format_error)?;
                writeln!(
                    code,
                    "      this.setAttribute(\"{}\", String(nextValue));",
                    prop.prop_name
                )
                .map_err(format_error)?;
                writeln!(code, "    }}").map_err(format_error)?;
            }
        }
        Ok(())
    }

    fn emit_mount(&self, code: &mut String) -> CompilerResult<()> {
        writeln!(code, "  #mount() {{").map_err(format_error)?;
        if self.module.options.shadow && !self.module.options.styles.is_empty() {
            writeln!(code, "    const style = document.createElement(\"style\");")
                .map_err(format_error)?;
            writeln!(
                code,
                "    style.textContent = [{}].join(\"\\n\");",
                self.module.options.styles.join(", ")
            )
            .map_err(format_error)?;
            writeln!(code, "    this.#root.append(style);").map_err(format_error)?;
        }
        for line in &self.mount_lines {
            writeln!(code, "    {line}").map_err(format_error)?;
        }
        writeln!(code, "  }}").map_err(format_error)?;
        Ok(())
    }

    fn emit_bindings(&self, code: &mut String) -> CompilerResult<()> {
        writeln!(code, "  #createBindings() {{").map_err(format_error)?;
        for prop in &self.module.props {
            writeln!(
                code,
                "    const {} = () => this.#props.{};",
                prop.local_name, prop.local_name
            )
            .map_err(format_error)?;
            writeln!(
                code,
                "    {}.set = (value) => {{ this.{} = value; }};",
                prop.local_name, prop.prop_name
            )
            .map_err(format_error)?;
            writeln!(
                code,
                "    {}.update = (updater) => {{ {}.set(updater({}())); }};",
                prop.local_name, prop.local_name, prop.local_name
            )
            .map_err(format_error)?;
        }
        for state in &self.module.states {
            self.emit_state_binding(code, state)?;
        }
        for event in &self.module.events {
            self.emit_event_binding(code, event)?;
        }
        let names = binding_names(self.module).join(", ");
        writeln!(code, "    return {{ {names} }};").map_err(format_error)?;
        writeln!(code, "  }}").map_err(format_error)?;
        Ok(())
    }

    fn emit_state_binding(&self, code: &mut String, state: &StateDefinition) -> CompilerResult<()> {
        writeln!(
            code,
            "    const {} = () => this.#state.{};",
            state.local_name, state.local_name
        )
        .map_err(format_error)?;
        writeln!(
            code,
            "    {}.set = (value) => {{ this.#state.{} = value; this.#update(); }};",
            state.local_name, state.local_name
        )
        .map_err(format_error)?;
        writeln!(
            code,
            "    {}.update = (updater) => {{ {}.set(updater({}())); }};",
            state.local_name, state.local_name, state.local_name
        )
        .map_err(format_error)?;
        Ok(())
    }

    fn emit_event_binding(&self, code: &mut String, event: &EventDefinition) -> CompilerResult<()> {
        writeln!(code, "    const {} = {{", event.local_name).map_err(format_error)?;
        writeln!(code, "      emit: (detail) => {{").map_err(format_error)?;
        writeln!(code, "        this.dispatchEvent(new CustomEvent(\"{}\", {{ detail, bubbles: true, composed: true, cancelable: false }}));", event.event_name)
            .map_err(format_error)?;
        writeln!(code, "      }}").map_err(format_error)?;
        writeln!(code, "    }};").map_err(format_error)?;
        Ok(())
    }

    fn emit_update(&self, code: &mut String) -> CompilerResult<()> {
        writeln!(code, "  #update() {{").map_err(format_error)?;
        writeln!(code, "    if (!this.#mounted) return;").map_err(format_error)?;
        let names = binding_names(self.module).join(", ");
        if !names.is_empty() {
            writeln!(code, "    const {{ {names} }} = this.#createBindings();")
                .map_err(format_error)?;
        }
        for line in &self.update_lines {
            writeln!(code, "    {line}").map_err(format_error)?;
        }
        writeln!(code, "  }}").map_err(format_error)?;
        Ok(())
    }

    fn emit_exports(&self, code: &mut String) -> CompilerResult<()> {
        if self.module.options.define {
            writeln!(
                code,
                "if (!customElements.get(\"{}\")) {{",
                self.module.tag_name
            )
            .map_err(format_error)?;
            writeln!(
                code,
                "  customElements.define(\"{}\", {});",
                self.module.tag_name, self.module.class_name
            )
            .map_err(format_error)?;
            writeln!(code, "}}").map_err(format_error)?;
        } else {
            writeln!(
                code,
                "export function define{}() {{",
                self.module.class_name
            )
            .map_err(format_error)?;
            writeln!(
                code,
                "  if (!customElements.get(\"{}\")) {{",
                self.module.tag_name
            )
            .map_err(format_error)?;
            writeln!(
                code,
                "    customElements.define(\"{}\", {});",
                self.module.tag_name, self.module.class_name
            )
            .map_err(format_error)?;
            writeln!(code, "  }}").map_err(format_error)?;
            writeln!(code, "}}").map_err(format_error)?;
        }
        writeln!(code, "export {{ {} }};", self.module.class_name).map_err(format_error)?;
        writeln!(code, "export default {};", self.module.class_name).map_err(format_error)?;
        Ok(())
    }

    fn emit_element(&mut self, element: &TemplateElement) -> CompilerResult<String> {
        let index = self.next_node_index;
        self.next_node_index += 1;
        let variable = format!("node{index}");
        let field = format!("node{index}");
        self.node_fields.push(field.clone());
        self.mount_lines.push(format!(
            "const {variable} = document.createElement(\"{}\");",
            element.tag_name
        ));
        self.mount_lines
            .push(format!("this.#{field} = {variable};"));

        let field_reference = format!("this.#{field}");
        for attribute in &element.attributes {
            self.emit_attribute(&variable, &field_reference, &field, attribute)?;
        }

        for child in &element.children {
            match child {
                TemplateChild::Element(child_element) => {
                    let child_variable = self.emit_element(child_element)?;
                    self.mount_lines
                        .push(format!("{variable}.append({child_variable});"));
                }
                TemplateChild::Text(text) => {
                    self.emit_text(&variable, text);
                }
            }
        }

        Ok(variable)
    }

    fn emit_attribute(
        &mut self,
        variable: &str,
        field_reference: &str,
        field_name: &str,
        attribute: &TemplateAttribute,
    ) -> CompilerResult<()> {
        if let Some(event_name) = event_name_from_attribute(&attribute.name) {
            let AttributeValue::Expression(expression) = &attribute.value else {
                return Err(unsupported(format!(
                    "Event attribute `{}` must use a braced handler expression.",
                    attribute.name
                )));
            };
            let body = handler_body(expression);
            self.mount_lines.push(format!(
                "{variable}.addEventListener(\"{event_name}\", (event) => {{"
            ));
            let names = binding_names(self.module).join(", ");
            if !names.is_empty() {
                self.mount_lines
                    .push(format!("  const {{ {names} }} = this.#createBindings();"));
            }
            for line in body.lines().map(str::trim).filter(|line| !line.is_empty()) {
                self.mount_lines.push(format!("  {line}"));
            }
            self.mount_lines.push("});".to_owned());
            return Ok(());
        }

        match &attribute.value {
            AttributeValue::Boolean => {
                self.mount_lines.push(format!(
                    "{variable}.setAttribute(\"{}\", \"\");",
                    attribute.name
                ));
            }
            AttributeValue::Static(value) => {
                self.mount_lines.push(format!(
                    "{variable}.setAttribute(\"{}\", \"{}\");",
                    attribute.name,
                    escape_js_string(value)
                ));
            }
            AttributeValue::Expression(expression) => {
                self.update_lines.push(dynamic_attribute_update(
                    field_reference,
                    field_name,
                    &attribute.name,
                    expression,
                ));
            }
        }
        Ok(())
    }

    fn emit_text(&mut self, parent_variable: &str, text: &str) {
        let Some(expression) = text_expression(text) else {
            return;
        };
        let index = self.next_text_index;
        self.next_text_index += 1;
        let variable = format!("text{index}");
        let field = format!("text{index}");
        self.text_fields.push(field.clone());
        self.mount_lines
            .push(format!("const {variable} = document.createTextNode(\"\");"));
        self.mount_lines
            .push(format!("this.#{field} = {variable};"));
        self.mount_lines
            .push(format!("{parent_variable}.append({variable});"));
        self.update_lines
            .push(format!("this.#{field}.data = {expression};"));
    }
}

fn attr_parse_expression(prop: &PropDefinition) -> String {
    match prop.kind {
        PropKind::String => {
            format!("newValue ?? {}", default_value_for_prop(prop))
        }
        PropKind::Boolean => "newValue !== null".to_owned(),
        PropKind::Number => {
            let default_value = default_value_for_prop(prop);
            format!("Number.isFinite(Number(newValue)) ? Number(newValue) : {default_value}")
        }
    }
}

fn setter_parse_expression(prop: &PropDefinition) -> String {
    match prop.kind {
        PropKind::String => "value == null ? \"\" : String(value)".to_owned(),
        PropKind::Boolean => "Boolean(value)".to_owned(),
        PropKind::Number => {
            let default_value = default_value_for_prop(prop);
            format!("Number.isFinite(Number(value)) ? Number(value) : {default_value}")
        }
    }
}

fn default_value_for_prop(prop: &PropDefinition) -> String {
    if prop.default_value.trim().is_empty() {
        match prop.kind {
            PropKind::String => "\"\"".to_owned(),
            PropKind::Boolean => "false".to_owned(),
            PropKind::Number => "0".to_owned(),
        }
    } else {
        prop.default_value.clone()
    }
}

fn dynamic_attribute_update(
    target: &str,
    target_key: &str,
    name: &str,
    expression: &str,
) -> String {
    if name == "disabled" {
        return format!(
            "{target}.toggleAttribute(\"disabled\", Boolean({expression})); {target}.disabled = Boolean({expression});"
        );
    }
    let value_variable = format!("{}_{}_value", target_key, name.replace('-', "_"));
    format!(
        "const {value_variable} = {expression}; if ({value_variable} == null || {value_variable} === false) {{ {target}.removeAttribute(\"{name}\"); }} else {{ {target}.setAttribute(\"{name}\", String({value_variable})); }}"
    )
}

fn text_expression(text: &str) -> Option<String> {
    let chunks = text_chunks(text);
    if chunks.is_empty() {
        return None;
    }
    let expression = chunks
        .into_iter()
        .map(|chunk| match chunk {
            TextChunk::Raw(value) => format!("\"{}\"", escape_js_string(&value)),
            TextChunk::Expression(value) => format!("String({value})"),
        })
        .collect::<Vec<_>>()
        .join(" + ");
    Some(expression)
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum TextChunk {
    Raw(String),
    Expression(String),
}

fn text_chunks(text: &str) -> Vec<TextChunk> {
    let mut chunks = Vec::new();
    let mut position = 0usize;
    while position < text.len() {
        let rest = &text[position..];
        let Some(open_relative) = rest.find('{') else {
            push_raw_text(&mut chunks, rest);
            break;
        };
        let open = position + open_relative;
        push_raw_text(&mut chunks, &text[position..open]);
        let Some(close_relative) = text[open + 1..].find('}') else {
            push_raw_text(&mut chunks, &text[open..]);
            break;
        };
        let close = open + 1 + close_relative;
        let expression = text[open + 1..close].trim();
        if !expression.is_empty() {
            chunks.push(TextChunk::Expression(expression.to_owned()));
        }
        position = close + 1;
    }
    chunks
}

fn push_raw_text(chunks: &mut Vec<TextChunk>, value: &str) {
    let normalized = normalize_jsx_text(value);
    if !normalized.is_empty() {
        chunks.push(TextChunk::Raw(normalized));
    }
}

fn normalize_jsx_text(value: &str) -> String {
    let collapsed = value.split_whitespace().collect::<Vec<_>>().join(" ");
    if collapsed.is_empty() {
        return collapsed;
    }
    let prefix = value
        .chars()
        .next()
        .filter(|ch| ch.is_whitespace())
        .map(|_| " ")
        .unwrap_or("");
    let suffix = value
        .chars()
        .last()
        .filter(|ch| ch.is_whitespace())
        .map(|_| " ")
        .unwrap_or("");
    format!("{prefix}{collapsed}{suffix}")
}

fn event_name_from_attribute(name: &str) -> Option<String> {
    let event_name = name.strip_prefix("on")?;
    if event_name.is_empty() {
        return None;
    }
    Some(event_name.to_ascii_lowercase())
}

fn handler_body(expression: &str) -> String {
    let trimmed = expression.trim();
    let Some(arrow_index) = trimmed.find("=>") else {
        return format!("{trimmed}(event);");
    };
    let body = trimmed[arrow_index + 2..].trim();
    if body.starts_with('{') && body.ends_with('}') && body.len() >= 2 {
        body[1..body.len() - 1].trim().to_owned()
    } else {
        format!("return {body};")
    }
}

fn binding_names(module: &ComponentModule) -> Vec<String> {
    module
        .props
        .iter()
        .map(|prop| prop.local_name.clone())
        .chain(module.states.iter().map(|state| state.local_name.clone()))
        .chain(module.events.iter().map(|event| event.local_name.clone()))
        .collect()
}

fn escape_js_string(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
}

fn format_error(error: std::fmt::Error) -> CompilerError {
    CompilerError::Unsupported {
        message: format!("Failed to generate component source: {error}"),
    }
}

fn unsupported(message: impl Into<String>) -> CompilerError {
    CompilerError::Unsupported {
        message: message.into(),
    }
}
