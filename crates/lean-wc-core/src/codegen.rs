use std::fmt::Write as _;

use crate::error::{CompilerError, CompilerResult};
use crate::model::{
    ComponentModule, ComputedDefinition, EffectDefinition, EventDefinition, PropAccess,
    PropDefinition, PropKind, StateDefinition, TransformResult,
};
use crate::naming::{
    custom_element_tag_for_component, is_pascal_case_identifier, kebab_case_identifier,
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
    Expression(String),
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
            } else if self.peek_char() == Some('{') {
                children.push(TemplateChild::Expression(self.parse_braced_expression()?));
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
            if matches!(ch, '<' | '{') {
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
        self.emit_component_imports(&mut code)?;
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
        self.emit_effects(&mut code)?;
        self.emit_flush(&mut code)?;
        self.emit_update(&mut code)?;
        writeln!(code, "}}").map_err(format_error)?;
        self.emit_exports(&mut code)?;
        Ok(code)
    }

    fn emit_component_imports(&self, code: &mut String) -> CompilerResult<()> {
        let mut sources = Vec::new();
        for component_import in &self.module.component_imports {
            if sources
                .iter()
                .any(|source| source == &component_import.source)
            {
                continue;
            }
            sources.push(component_import.source.clone());
            writeln!(
                code,
                "import \"{}\";",
                escape_js_string(&component_import.source)
            )
            .map_err(format_error)?;
        }
        if !sources.is_empty() {
            writeln!(code).map_err(format_error)?;
        }
        Ok(())
    }

    fn emit_observed_attributes(&self, code: &mut String) -> CompilerResult<()> {
        let attributes = self
            .module
            .props
            .iter()
            .map(|prop| format!("\"{}\"", prop.attribute_name))
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
        if self.module.uses_host_helpers {
            writeln!(code, "  #abortController = new AbortController();").map_err(format_error)?;
        }
        if !self.module.effects.is_empty() {
            writeln!(code, "  #effectCleanups = [];").map_err(format_error)?;
        }
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
        writeln!(code, "    this.#flush();").map_err(format_error)?;
        writeln!(code, "  }}").map_err(format_error)?;
        if self.module.uses_host_helpers || !self.module.effects.is_empty() {
            writeln!(code, "  disconnectedCallback() {{").map_err(format_error)?;
            if self.module.uses_host_helpers {
                writeln!(code, "    this.#abortController.abort();").map_err(format_error)?;
            }
            if !self.module.effects.is_empty() {
                writeln!(code, "    this.#cleanupEffects();").map_err(format_error)?;
            }
            if self.module.uses_host_helpers {
                writeln!(code, "    this.#abortController = new AbortController();")
                    .map_err(format_error)?;
            }
            writeln!(code, "  }}").map_err(format_error)?;
        }
        writeln!(
            code,
            "  attributeChangedCallback(name, oldValue, newValue) {{"
        )
        .map_err(format_error)?;
        writeln!(code, "    if (oldValue === newValue) return;").map_err(format_error)?;
        writeln!(code, "    switch (name) {{").map_err(format_error)?;
        for prop in &self.module.props {
            writeln!(code, "      case \"{}\":", prop.attribute_name).map_err(format_error)?;
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
        writeln!(code, "    this.#flush();").map_err(format_error)?;
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
            writeln!(code, "    this.#flush();").map_err(format_error)?;
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
                    prop.attribute_name
                )
                .map_err(format_error)?;
                writeln!(code, "    }} else {{").map_err(format_error)?;
                writeln!(
                    code,
                    "      this.removeAttribute(\"{}\");",
                    prop.attribute_name
                )
                .map_err(format_error)?;
                writeln!(code, "    }}").map_err(format_error)?;
            }
            PropKind::Number | PropKind::String => {
                writeln!(
                    code,
                    "    if (this.getAttribute(\"{}\") !== String(nextValue)) {{",
                    prop.attribute_name
                )
                .map_err(format_error)?;
                writeln!(
                    code,
                    "      this.setAttribute(\"{}\", String(nextValue));",
                    prop.attribute_name
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
            match prop.access {
                PropAccess::Accessor => {
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
                PropAccess::Value => {
                    writeln!(
                        code,
                        "    const {} = this.#props.{};",
                        prop.local_name, prop.local_name
                    )
                    .map_err(format_error)?;
                }
            }
        }
        for state in &self.module.states {
            self.emit_state_binding(code, state)?;
        }
        for computed in &self.module.computed {
            self.emit_computed_binding(code, computed)?;
        }
        for event in &self.module.events {
            self.emit_event_binding(code, event)?;
        }
        if self.module.uses_host_helpers {
            writeln!(code, "    const host = () => ({{").map_err(format_error)?;
            writeln!(code, "      element: this,").map_err(format_error)?;
            writeln!(code, "      root: this.#root,").map_err(format_error)?;
            writeln!(code, "      signal: this.#abortController.signal,").map_err(format_error)?;
            writeln!(code, "      update: () => this.#flush(),").map_err(format_error)?;
            writeln!(code, "    }});").map_err(format_error)?;
            writeln!(code, "    const useHost = host;").map_err(format_error)?;
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
            "    {}.set = (value) => {{ this.#state.{} = value; this.#flush(); }};",
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

    fn emit_computed_binding(
        &self,
        code: &mut String,
        computed: &ComputedDefinition,
    ) -> CompilerResult<()> {
        writeln!(
            code,
            "    const {} = () => ({});",
            computed.local_name, computed.expression
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

    fn emit_effects(&self, code: &mut String) -> CompilerResult<()> {
        if self.module.effects.is_empty() {
            return Ok(());
        }
        writeln!(code, "  #cleanupEffects() {{").map_err(format_error)?;
        writeln!(
            code,
            "    for (const cleanup of this.#effectCleanups.splice(0)) {{"
        )
        .map_err(format_error)?;
        writeln!(code, "      cleanup();").map_err(format_error)?;
        writeln!(code, "    }}").map_err(format_error)?;
        writeln!(code, "  }}").map_err(format_error)?;
        writeln!(code, "  #runEffects() {{").map_err(format_error)?;
        writeln!(code, "    this.#cleanupEffects();").map_err(format_error)?;
        let names = binding_names(self.module).join(", ");
        if !names.is_empty() {
            writeln!(code, "    const {{ {names} }} = this.#createBindings();")
                .map_err(format_error)?;
        }
        for (index, effect) in self.module.effects.iter().enumerate() {
            self.emit_effect_body(code, index, effect)?;
        }
        writeln!(code, "  }}").map_err(format_error)?;
        Ok(())
    }

    fn emit_effect_body(
        &self,
        code: &mut String,
        index: usize,
        effect: &EffectDefinition,
    ) -> CompilerResult<()> {
        writeln!(code, "    const cleanup{index} = (() => {{").map_err(format_error)?;
        for line in effect
            .body
            .lines()
            .map(str::trim)
            .filter(|line| !line.is_empty())
        {
            writeln!(code, "      {line}").map_err(format_error)?;
        }
        writeln!(code, "    }})();").map_err(format_error)?;
        writeln!(code, "    if (typeof cleanup{index} === \"function\") {{")
            .map_err(format_error)?;
        writeln!(code, "      this.#effectCleanups.push(cleanup{index});").map_err(format_error)?;
        writeln!(code, "    }}").map_err(format_error)?;
        Ok(())
    }

    fn emit_flush(&self, code: &mut String) -> CompilerResult<()> {
        writeln!(code, "  #flush() {{").map_err(format_error)?;
        writeln!(code, "    this.#update();").map_err(format_error)?;
        if !self.module.effects.is_empty() {
            writeln!(code, "    this.#runEffects();").map_err(format_error)?;
        }
        writeln!(code, "  }}").map_err(format_error)?;
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
            writeln!(code, "export function {}() {{", self.define_function_name())
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
        if let Some(export_name) = &self.module.export_name {
            writeln!(
                code,
                "export {{ {} as {} }};",
                self.module.class_name, export_name
            )
            .map_err(format_error)?;
        } else {
            writeln!(code, "export {{ {} }};", self.module.class_name).map_err(format_error)?;
        }
        writeln!(code, "export default {};", self.module.class_name).map_err(format_error)?;
        Ok(())
    }

    fn define_function_name(&self) -> String {
        self.module
            .export_name
            .as_ref()
            .map(|export_name| format!("define{export_name}"))
            .unwrap_or_else(|| format!("define{}", self.module.class_name))
    }

    fn emit_element(&mut self, element: &TemplateElement) -> CompilerResult<String> {
        if element.tag_name == "Show" {
            return self.emit_show_control(element);
        }
        if element.tag_name == "For" {
            return self.emit_for_control(element);
        }

        let index = self.next_node_index;
        self.next_node_index += 1;
        let variable = format!("node{index}");
        let field = format!("node{index}");
        let tag_name = self.element_tag_name(&element.tag_name);
        let is_component_element = is_pascal_case_identifier(&element.tag_name);
        self.node_fields.push(field.clone());
        self.mount_lines.push(format!(
            "const {variable} = document.createElement(\"{}\");",
            escape_js_string(&tag_name)
        ));
        self.mount_lines
            .push(format!("this.#{field} = {variable};"));

        let field_reference = format!("this.#{field}");
        for attribute in &element.attributes {
            self.emit_attribute(
                &variable,
                &field_reference,
                &field,
                attribute,
                is_component_element,
            )?;
        }

        for child in &element.children {
            self.emit_child(&variable, child)?;
        }

        Ok(variable)
    }

    fn emit_child(&mut self, parent_variable: &str, child: &TemplateChild) -> CompilerResult<()> {
        match child {
            TemplateChild::Element(child_element) => {
                let child_variable = self.emit_element(child_element)?;
                self.mount_lines
                    .push(format!("{parent_variable}.append({child_variable});"));
            }
            TemplateChild::Expression(expression) => {
                self.emit_expression(parent_variable, expression)?;
            }
            TemplateChild::Text(text) => {
                self.emit_text(parent_variable, text);
            }
        }
        Ok(())
    }

    fn emit_show_control(&mut self, element: &TemplateElement) -> CompilerResult<String> {
        let when = required_expression_attribute(element, "when")?.to_owned();
        let index = self.next_node_index;
        self.next_node_index += 1;
        let variable = format!("node{index}");
        let field = format!("node{index}");
        let content_variable = format!("{variable}Content");
        let content_field = format!("{field}Content");
        let fallback_variable = format!("{variable}Fallback");
        let fallback_field = format!("{field}Fallback");

        self.node_fields.push(field.clone());
        self.node_fields.push(content_field.clone());
        self.node_fields.push(fallback_field.clone());
        self.mount_lines.push(format!(
            "const {variable} = document.createElement(\"span\");"
        ));
        self.mount_lines
            .push(format!("{variable}.style.display = \"contents\";"));
        self.mount_lines.push(format!(
            "{variable}.setAttribute(\"data-lean-control\", \"show\");"
        ));
        self.mount_lines
            .push(format!("this.#{field} = {variable};"));
        self.mount_lines.push(format!(
            "const {content_variable} = document.createElement(\"span\");"
        ));
        self.mount_lines
            .push(format!("{content_variable}.style.display = \"contents\";"));
        self.mount_lines
            .push(format!("this.#{content_field} = {content_variable};"));
        self.mount_lines.push(format!(
            "const {fallback_variable} = document.createElement(\"span\");"
        ));
        self.mount_lines
            .push(format!("{fallback_variable}.style.display = \"contents\";"));
        self.mount_lines
            .push(format!("this.#{fallback_field} = {fallback_variable};"));
        self.mount_lines.push(format!(
            "{variable}.append({content_variable}, {fallback_variable});"
        ));

        for child in &element.children {
            self.emit_child(&content_variable, child)?;
        }
        if let Some(fallback) = optional_attribute(element, "fallback") {
            self.emit_show_fallback(&fallback_variable, fallback)?;
        }

        let condition_variable = format!("{field}When");
        self.update_lines
            .push(format!("const {condition_variable} = Boolean({when});"));
        self.update_lines.push(format!(
            "this.#{content_field}.hidden = !{condition_variable}; this.#{fallback_field}.hidden = {condition_variable};"
        ));

        Ok(variable)
    }

    fn emit_show_fallback(
        &mut self,
        fallback_variable: &str,
        attribute: &TemplateAttribute,
    ) -> CompilerResult<()> {
        match &attribute.value {
            AttributeValue::Expression(expression) => {
                let trimmed = expression.trim();
                if trimmed.starts_with('<') {
                    let fallback = TemplateParser::new(trimmed).parse_element()?;
                    let fallback_child = self.emit_element(&fallback)?;
                    self.mount_lines
                        .push(format!("{fallback_variable}.append({fallback_child});"));
                } else {
                    self.emit_expression(fallback_variable, trimmed)?;
                }
            }
            AttributeValue::Static(value) => {
                self.emit_text(fallback_variable, value);
            }
            AttributeValue::Boolean => {
                return Err(unsupported("Show fallback must have a value."));
            }
        }
        Ok(())
    }

    fn emit_for_control(&mut self, element: &TemplateElement) -> CompilerResult<String> {
        let each = required_expression_attribute(element, "each")?.to_owned();
        let renderer = parse_for_renderer(element)?;
        let rendered_template = TemplateParser::new(&renderer.template_source).parse_element()?;
        let index = self.next_node_index;
        self.next_node_index += 1;
        let variable = format!("node{index}");
        let field = format!("node{index}");
        let items_variable = format!("{field}Items");
        let render_prefix = format!("for{index}");
        let mut render_lines = Vec::new();
        let mut render_index = 0usize;
        let rendered_variable = self.emit_inline_element(
            &rendered_template,
            &render_prefix,
            &mut render_index,
            &mut render_lines,
        )?;

        self.node_fields.push(field.clone());
        self.mount_lines.push(format!(
            "const {variable} = document.createElement(\"span\");"
        ));
        self.mount_lines
            .push(format!("{variable}.style.display = \"contents\";"));
        self.mount_lines.push(format!(
            "{variable}.setAttribute(\"data-lean-control\", \"for\");"
        ));
        self.mount_lines
            .push(format!("this.#{field} = {variable};"));

        self.update_lines.push(format!(
            "const {items_variable} = Array.from(({each}) ?? []);"
        ));
        self.update_lines.push(format!(
            "this.#{field}.replaceChildren(...{items_variable}.map(({}, {}) => {{",
            renderer.item_name, renderer.index_name
        ));
        for line in render_lines {
            self.update_lines.push(format!("  {line}"));
        }
        self.update_lines
            .push(format!("  return {rendered_variable};"));
        self.update_lines.push("}));".to_owned());

        Ok(variable)
    }

    fn emit_inline_element(
        &self,
        element: &TemplateElement,
        prefix: &str,
        next_index: &mut usize,
        lines: &mut Vec<String>,
    ) -> CompilerResult<String> {
        let index = *next_index;
        *next_index += 1;
        let variable = format!("{prefix}Node{index}");
        let tag_name = self.element_tag_name(&element.tag_name);
        let is_component_element = is_pascal_case_identifier(&element.tag_name);
        lines.push(format!(
            "const {variable} = document.createElement(\"{}\");",
            escape_js_string(&tag_name)
        ));

        for attribute in &element.attributes {
            self.emit_inline_attribute(
                &variable,
                &variable,
                attribute,
                is_component_element,
                lines,
            )?;
        }

        for child in &element.children {
            match child {
                TemplateChild::Element(child_element) => {
                    let child_variable =
                        self.emit_inline_element(child_element, prefix, next_index, lines)?;
                    lines.push(format!("{variable}.append({child_variable});"));
                }
                TemplateChild::Expression(expression) => {
                    let text_variable = format!("{prefix}Text{}", *next_index);
                    *next_index += 1;
                    lines.push(format!(
                        "const {text_variable} = document.createTextNode(String({}));",
                        expression.trim()
                    ));
                    lines.push(format!("{variable}.append({text_variable});"));
                }
                TemplateChild::Text(text) => {
                    if let Some(expression) = text_expression(text) {
                        let text_variable = format!("{prefix}Text{}", *next_index);
                        *next_index += 1;
                        lines.push(format!(
                            "const {text_variable} = document.createTextNode({expression});"
                        ));
                        lines.push(format!("{variable}.append({text_variable});"));
                    }
                }
            }
        }

        Ok(variable)
    }

    fn emit_inline_attribute(
        &self,
        variable: &str,
        target_key: &str,
        attribute: &TemplateAttribute,
        is_component_element: bool,
        lines: &mut Vec<String>,
    ) -> CompilerResult<()> {
        if let Some(event_name) = event_name_from_attribute(&attribute.name) {
            let AttributeValue::Expression(expression) = &attribute.value else {
                return Err(unsupported(format!(
                    "Event attribute `{}` must use a braced handler expression.",
                    attribute.name
                )));
            };
            lines.push(format!(
                "{variable}.addEventListener(\"{event_name}\", (event) => {{"
            ));
            for line in handler_body(expression)
                .lines()
                .map(str::trim)
                .filter(|line| !line.is_empty())
            {
                lines.push(format!("  {line}"));
            }
            lines.push("});".to_owned());
            return Ok(());
        }

        let attribute_name = attribute_name_for_element(&attribute.name, is_component_element);
        match &attribute.value {
            AttributeValue::Boolean => {
                lines.push(format!(
                    "{variable}.setAttribute(\"{}\", \"\");",
                    attribute_name
                ));
            }
            AttributeValue::Static(value) => {
                lines.push(format!(
                    "{variable}.setAttribute(\"{}\", \"{}\");",
                    attribute_name,
                    escape_js_string(value)
                ));
            }
            AttributeValue::Expression(expression) => {
                lines.push(dynamic_attribute_update(
                    variable,
                    target_key,
                    &attribute_name,
                    expression,
                ));
            }
        }
        Ok(())
    }

    fn element_tag_name(&self, tag_name: &str) -> String {
        if !is_pascal_case_identifier(tag_name) {
            return tag_name.to_owned();
        }
        let component_name = self
            .module
            .component_imports
            .iter()
            .find(|component_import| component_import.local_name == tag_name)
            .map(|component_import| component_import.imported_name.as_str())
            .unwrap_or(tag_name);
        custom_element_tag_for_component(component_name)
    }

    fn emit_attribute(
        &mut self,
        variable: &str,
        field_reference: &str,
        field_name: &str,
        attribute: &TemplateAttribute,
        is_component_element: bool,
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

        let attribute_name = attribute_name_for_element(&attribute.name, is_component_element);
        match &attribute.value {
            AttributeValue::Boolean => {
                self.mount_lines.push(format!(
                    "{variable}.setAttribute(\"{}\", \"\");",
                    attribute_name
                ));
            }
            AttributeValue::Static(value) => {
                self.mount_lines.push(format!(
                    "{variable}.setAttribute(\"{}\", \"{}\");",
                    attribute_name,
                    escape_js_string(value)
                ));
            }
            AttributeValue::Expression(expression) => {
                self.update_lines.push(dynamic_attribute_update(
                    field_reference,
                    field_name,
                    &attribute_name,
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

    fn emit_expression(&mut self, parent_variable: &str, expression: &str) -> CompilerResult<()> {
        let trimmed = expression.trim();
        if trimmed.is_empty() {
            return Ok(());
        }
        validate_child_expression(trimmed)?;
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
            .push(format!("this.#{field}.data = String({trimmed});"));
        Ok(())
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

fn required_expression_attribute<'a>(
    element: &'a TemplateElement,
    name: &str,
) -> CompilerResult<&'a str> {
    let Some(attribute) = optional_attribute(element, name) else {
        return Err(unsupported(format!(
            "<{}> requires a `{name}` attribute.",
            element.tag_name
        )));
    };
    let AttributeValue::Expression(expression) = &attribute.value else {
        return Err(unsupported(format!(
            "<{}> attribute `{name}` must use a braced expression.",
            element.tag_name
        )));
    };
    Ok(expression)
}

fn optional_attribute<'a>(
    element: &'a TemplateElement,
    name: &str,
) -> Option<&'a TemplateAttribute> {
    element
        .attributes
        .iter()
        .find(|attribute| attribute.name == name)
}

struct ForRenderer {
    item_name: String,
    index_name: String,
    template_source: String,
}

fn parse_for_renderer(element: &TemplateElement) -> CompilerResult<ForRenderer> {
    let expressions = element
        .children
        .iter()
        .filter_map(|child| match child {
            TemplateChild::Expression(expression) if !expression.trim().is_empty() => {
                Some(expression.trim())
            }
            _ => None,
        })
        .collect::<Vec<_>>();

    if expressions.len() != 1 {
        return Err(unsupported(
            "<For> requires exactly one braced arrow-function child.",
        ));
    }

    let expression = expressions[0];
    let Some(arrow_index) = expression.find("=>") else {
        return Err(unsupported("<For> child must be an arrow function."));
    };
    let params = expression[..arrow_index].trim();
    let body = strip_wrapping_parentheses(expression[arrow_index + 2..].trim());
    if !body.starts_with('<') {
        return Err(unsupported(
            "<For> arrow child must return a TSX element expression.",
        ));
    }

    let params = strip_wrapping_parentheses(params);
    let mut param_parts = split_top_level_commas(params)
        .into_iter()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let Some(item_name) = param_parts.next() else {
        return Err(unsupported("<For> child must name an item parameter."));
    };
    let index_name = param_parts.next().unwrap_or("index");
    if param_parts.next().is_some() {
        return Err(unsupported(
            "<For> child currently supports item and index parameters only.",
        ));
    }
    if !is_identifier(item_name) || !is_identifier(index_name) {
        return Err(unsupported(
            "<For> child parameters must be simple identifiers.",
        ));
    }

    Ok(ForRenderer {
        item_name: item_name.to_owned(),
        index_name: index_name.to_owned(),
        template_source: body.to_owned(),
    })
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
    if name.starts_with("aria-") {
        return format!(
            "const {value_variable} = {expression}; if ({value_variable} == null) {{ {target}.removeAttribute(\"{name}\"); }} else {{ {target}.setAttribute(\"{name}\", String({value_variable})); }}"
        );
    }
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

fn validate_child_expression(expression: &str) -> CompilerResult<()> {
    if !contains_jsx_tag_start(expression) {
        return Ok(());
    }
    if expression.contains(".map(") {
        return Err(unsupported(
            "JSX array mapping is not supported. Use the explicit <For each={...}> control-flow primitive.",
        ));
    }
    if expression.contains('?') || expression.contains("&&") || expression.contains("||") {
        return Err(unsupported(
            "Conditional JSX expressions are not supported. Use the explicit <Show when={...}> control-flow primitive.",
        ));
    }
    Err(unsupported(
        "JSX expression children are not supported outside explicit compiler primitives.",
    ))
}

fn contains_jsx_tag_start(expression: &str) -> bool {
    let mut chars = expression.chars().peekable();
    while let Some(ch) = chars.next() {
        if ch != '<' {
            continue;
        }
        let Some(next) = chars.peek().copied() else {
            continue;
        };
        if next == '/' || next.is_ascii_alphabetic() {
            return true;
        }
    }
    false
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
    Some(kebab_case_identifier(event_name))
}

fn handler_body(expression: &str) -> String {
    let trimmed = expression.trim();
    if let Some(handler) = on_helper_handler(trimmed) {
        return handler_body(handler);
    }
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

fn on_helper_handler(expression: &str) -> Option<&str> {
    let rest = expression.strip_prefix("on")?.trim_start();
    if !rest.starts_with('(') {
        return None;
    }
    let open = expression.find('(')?;
    let close = find_matching_delimiter(expression, open, '(', ')').ok()?;
    if !expression[close + 1..].trim().is_empty() {
        return None;
    }
    let arguments = &expression[open + 1..close];
    let parts = split_top_level_commas(arguments);
    if parts.len() != 2 {
        return None;
    }
    Some(parts[1].trim())
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

fn strip_wrapping_parentheses(source: &str) -> &str {
    let trimmed = source.trim();
    if trimmed.starts_with('(')
        && trimmed.ends_with(')')
        && find_matching_delimiter(trimmed, 0, '(', ')').ok() == Some(trimmed.len() - 1)
    {
        return trimmed[1..trimmed.len() - 1].trim();
    }
    trimmed
}

fn is_identifier(source: &str) -> bool {
    let mut chars = source.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    if !(first.is_ascii_alphabetic() || matches!(first, '_' | '$')) {
        return false;
    }
    chars.all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '_' | '$'))
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

fn binding_names(module: &ComponentModule) -> Vec<String> {
    let mut names = module
        .props
        .iter()
        .map(|prop| prop.local_name.clone())
        .chain(module.states.iter().map(|state| state.local_name.clone()))
        .chain(
            module
                .computed
                .iter()
                .map(|computed| computed.local_name.clone()),
        )
        .chain(module.events.iter().map(|event| event.local_name.clone()))
        .collect::<Vec<_>>();
    if module.uses_host_helpers {
        names.push("host".to_owned());
        names.push("useHost".to_owned());
    }
    names
}

fn escape_js_string(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\n', "\\n")
        .replace('\r', "\\r")
}

fn attribute_name_for_element(name: &str, is_component_element: bool) -> String {
    if is_component_element && !name.starts_with("data-") && !name.starts_with("aria-") {
        return kebab_case_identifier(name);
    }
    name.to_owned()
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
