use oxc_allocator::Allocator;
use oxc_ast::ast::{
    Argument, ArrowFunctionExpression, BinaryExpression, BindingPattern, CallExpression,
    Declaration, ExportDefaultDeclarationKind, Expression, Function, FunctionBody,
    ImportDeclarationSpecifier, ImportOrExportKind, ModuleExportName, Program, Statement,
    VariableDeclarationKind,
};
use oxc_parser::Parser;
use oxc_span::{GetSpan, SourceType, Span};

use crate::error::{
    CompilerError, CompilerResult, DIAGNOSTIC_CODE_UNSUPPORTED_COMPUTED_CALLBACK,
    DIAGNOSTIC_CODE_UNSUPPORTED_EFFECT_CALLBACK, DIAGNOSTIC_HINT_AUTHORING_LIMITATIONS,
    removed_authoring_api, removed_authoring_api_with_span, unsupported, unsupported_with_code,
    unsupported_with_code_and_span,
};
use crate::model::{
    ComponentImport, ComputedDefinition, DiagnosticSpan, EffectDefinition, EventDefinition,
    FormControlDefinition, KeyedSelectorDefinition, LifecycleCallbackDefinition, RuntimeImport,
    StateDefinition, StateKind, StyleImport,
};
use crate::naming::is_pascal_case_identifier;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct SourceSpan {
    pub(crate) start: usize,
    pub(crate) end: usize,
}

impl SourceSpan {
    pub(crate) const fn from_oxc(span: Span) -> Self {
        Self {
            start: span.start as usize,
            end: span.end as usize,
        }
    }

    const fn to_diagnostic(self) -> DiagnosticSpan {
        DiagnosticSpan {
            start: self.start,
            end: self.end,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub(crate) struct AstComponentSemantics {
    pub(crate) states: Vec<StateDefinition>,
    pub(crate) form_controls: Vec<FormControlDefinition>,
    pub(crate) computed: Vec<ComputedDefinition>,
    pub(crate) keyed_selectors: Vec<KeyedSelectorDefinition>,
    pub(crate) effects: Vec<EffectDefinition>,
    pub(crate) connected_callbacks: Vec<LifecycleCallbackDefinition>,
    pub(crate) disconnected_callbacks: Vec<LifecycleCallbackDefinition>,
    pub(crate) events: Vec<EventDefinition>,
    pub(crate) uses_host_helpers: bool,
    pub(crate) template_source: Option<String>,
}

#[derive(Debug, Clone)]
pub(crate) struct AstFunctionComponent {
    pub(crate) name: String,
    pub(crate) params: SourceSpan,
    pub(crate) semantics: AstComponentSemantics,
}

#[derive(Debug, Default)]
pub(crate) struct AstModuleFacts {
    pub(crate) component_imports: Vec<ComponentImport>,
    pub(crate) runtime_imports: Vec<RuntimeImport>,
    pub(crate) style_imports: Vec<StyleImport>,
    pub(crate) function_components: Vec<AstFunctionComponent>,
}

pub(crate) fn analyze_module(source: &str, filename: &str) -> CompilerResult<AstModuleFacts> {
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(filename).unwrap_or_else(|_| SourceType::tsx());
    let parsed = Parser::new(&allocator, source, source_type).parse();

    if !parsed.errors.is_empty() {
        let messages = parsed
            .errors
            .iter()
            .map(ToString::to_string)
            .collect::<Vec<_>>()
            .join(", ");

        return Err(CompilerError::ParseModuleSource {
            filename: filename.to_owned(),
            messages,
        });
    }

    AstAnalyzer::new(source, &parsed.program).analyze()
}

struct AstAnalyzer<'a, 'program> {
    source: &'a str,
    program: &'program Program<'a>,
}

impl<'a, 'program> AstAnalyzer<'a, 'program> {
    const fn new(source: &'a str, program: &'program Program<'a>) -> Self {
        Self { source, program }
    }

    fn analyze(&self) -> CompilerResult<AstModuleFacts> {
        let mut facts = AstModuleFacts::default();
        for statement in &self.program.body {
            self.capture_statement(statement, &mut facts)?;
        }
        Ok(facts)
    }

    fn capture_statement(
        &self,
        statement: &Statement<'a>,
        facts: &mut AstModuleFacts,
    ) -> CompilerResult<()> {
        match statement {
            Statement::ImportDeclaration(import) => {
                capture_component_imports(import, facts);
                capture_style_imports(import, facts);
                capture_runtime_import(self.source, import, facts)?;
            }
            Statement::ExportNamedDeclaration(export) => {
                if let Some(Declaration::FunctionDeclaration(function)) = &export.declaration {
                    push_function_component(self.source, function, facts)?;
                }
            }
            Statement::ExportDefaultDeclaration(export) => match &export.declaration {
                ExportDefaultDeclarationKind::FunctionDeclaration(function) => {
                    push_function_component(self.source, function, facts)?;
                }
                ExportDefaultDeclarationKind::CallExpression(call) => reject_removed_call(call)?,
                _ => {}
            },
            Statement::ExpressionStatement(statement) => {
                if let Expression::CallExpression(call) = &statement.expression {
                    reject_removed_call(call)?;
                }
            }
            _ => {}
        }
        Ok(())
    }
}

fn capture_runtime_import(
    source: &str,
    import: &oxc_ast::ast::ImportDeclaration<'_>,
    facts: &mut AstModuleFacts,
) -> CompilerResult<()> {
    let import_source = import.source.value.as_str();
    if import.import_kind == ImportOrExportKind::Type
        || import_source == "@iktia/core"
        || import_source.contains(".wc")
        || is_inline_css_source(import_source)
    {
        return Ok(());
    }
    if import
        .specifiers
        .as_ref()
        .is_some_and(|specifiers| specifiers.iter().all(is_type_import_specifier))
    {
        return Ok(());
    }
    facts.runtime_imports.push(RuntimeImport {
        source: source_span(source, SourceSpan::from_oxc(import.span()))?.to_owned(),
    });
    Ok(())
}

fn is_type_import_specifier(specifier: &ImportDeclarationSpecifier<'_>) -> bool {
    matches!(
        specifier,
        ImportDeclarationSpecifier::ImportSpecifier(specifier)
            if specifier.import_kind == ImportOrExportKind::Type
    )
}

fn capture_component_imports(
    import: &oxc_ast::ast::ImportDeclaration<'_>,
    facts: &mut AstModuleFacts,
) {
    let source = import.source.value.as_str();
    if !source.contains(".wc") {
        return;
    }

    let Some(specifiers) = &import.specifiers else {
        return;
    };

    for specifier in specifiers {
        match specifier {
            ImportDeclarationSpecifier::ImportSpecifier(specifier) => {
                if specifier.import_kind == ImportOrExportKind::Type {
                    continue;
                }
                let Some(imported_name) = module_export_name(&specifier.imported) else {
                    continue;
                };
                facts.component_imports.push(ComponentImport {
                    imported_name,
                    local_name: specifier.local.name.as_str().to_owned(),
                    source: source.to_owned(),
                });
            }
            ImportDeclarationSpecifier::ImportDefaultSpecifier(specifier) => {
                let local_name = specifier.local.name.as_str().to_owned();
                facts.component_imports.push(ComponentImport {
                    imported_name: local_name.clone(),
                    local_name,
                    source: source.to_owned(),
                });
            }
            ImportDeclarationSpecifier::ImportNamespaceSpecifier(_) => {}
        }
    }
}

fn capture_style_imports(import: &oxc_ast::ast::ImportDeclaration<'_>, facts: &mut AstModuleFacts) {
    let source = import.source.value.as_str();
    if !is_inline_css_source(source) {
        return;
    }

    let Some(specifiers) = &import.specifiers else {
        return;
    };

    for specifier in specifiers {
        if let ImportDeclarationSpecifier::ImportDefaultSpecifier(specifier) = specifier {
            facts.style_imports.push(StyleImport {
                local_name: specifier.local.name.as_str().to_owned(),
                source: source.to_owned(),
            });
        }
    }
}

fn is_inline_css_source(source: &str) -> bool {
    let Some((path, query)) = source.split_once('?') else {
        return false;
    };
    path.ends_with(".css") && query.split('&').any(|part| part == "inline")
}

fn module_export_name(name: &ModuleExportName<'_>) -> Option<String> {
    match name {
        ModuleExportName::IdentifierName(identifier) => Some(identifier.name.as_str().to_owned()),
        ModuleExportName::IdentifierReference(identifier) => {
            Some(identifier.name.as_str().to_owned())
        }
        ModuleExportName::StringLiteral(_) => None,
    }
}

fn push_function_component(
    source: &str,
    function: &Function<'_>,
    facts: &mut AstModuleFacts,
) -> CompilerResult<()> {
    let Some(identifier) = &function.id else {
        return Ok(());
    };
    let name = identifier.name.as_str();
    if !is_pascal_case_identifier(name) {
        return Ok(());
    }
    let Some(body) = &function.body else {
        return Ok(());
    };

    facts.function_components.push(AstFunctionComponent {
        name: name.to_owned(),
        params: SourceSpan::from_oxc(function.params.span),
        semantics: analyze_component_body(source, body)?,
    });
    Ok(())
}

fn analyze_component_body(
    source: &str,
    body: &FunctionBody<'_>,
) -> CompilerResult<AstComponentSemantics> {
    let mut semantics = AstComponentSemantics::default();
    let body_source = source_span(source, SourceSpan::from_oxc(body.span))?;
    semantics.uses_host_helpers = contains_call(body_source, "host");

    // Walk statements before string fallbacks so direct helper calls keep AST spans.
    for statement in &body.statements {
        capture_body_statement(source, statement, &mut semantics)?;
    }

    // These are span-less fallbacks for nested or otherwise unsupported helper shapes.
    if contains_call(body_source, "signal") {
        return Err(removed_authoring_api(
            "signal() was removed from the v0.1 authoring API. Use state() for local component state.",
        ));
    }
    if contains_prop_call(body_source) {
        return Err(removed_authoring_api(
            "prop.*() and prop() were removed from the v0.1 authoring API. Declare props with typed function parameters instead.",
        ));
    }
    if contains_call(body_source, "useHost") {
        return Err(removed_authoring_api(
            "useHost() was removed from the v0.1 authoring API. Use host() instead.",
        ));
    }

    Ok(semantics)
}

fn capture_body_statement(
    source: &str,
    statement: &Statement<'_>,
    semantics: &mut AstComponentSemantics,
) -> CompilerResult<()> {
    match statement {
        Statement::VariableDeclaration(declaration) => {
            if declaration.kind != VariableDeclarationKind::Const {
                return Ok(());
            }
            for declarator in &declaration.declarations {
                let Some(local_name) = binding_identifier_name(&declarator.id) else {
                    continue;
                };
                match &declarator.init {
                    Some(Expression::CallExpression(call)) => {
                        capture_authoring_const(source, local_name, call, semantics)?;
                    }
                    Some(Expression::ArrowFunctionExpression(arrow)) => {
                        if let Some(selector) = capture_keyed_selector(local_name, arrow, semantics)
                        {
                            semantics.keyed_selectors.push(selector);
                        }
                    }
                    _ => {}
                }
            }
        }
        Statement::ExpressionStatement(statement) => {
            if let Expression::CallExpression(call) = &statement.expression {
                match call_name(call) {
                    Some("effect") => {
                        if let Some(callback) = call.arguments.first() {
                            semantics.effects.push(EffectDefinition {
                                body: capture_arrow_body_source(source, callback)?,
                            });
                        }
                    }
                    Some("onConnected") => {
                        let Some(callback) = call.arguments.first() else {
                            return Err(unsupported("onConnected() requires a callback."));
                        };
                        semantics
                            .connected_callbacks
                            .push(LifecycleCallbackDefinition {
                                body: capture_arrow_body_source(source, callback)?,
                            });
                    }
                    Some("onDisconnected") => {
                        let Some(callback) = call.arguments.first() else {
                            return Err(unsupported("onDisconnected() requires a callback."));
                        };
                        semantics
                            .disconnected_callbacks
                            .push(LifecycleCallbackDefinition {
                                body: capture_arrow_body_source(source, callback)?,
                            });
                    }
                    _ => {}
                }
            }
        }
        Statement::ReturnStatement(statement) => {
            if let Some(argument) = &statement.argument {
                let template = source_span(source, SourceSpan::from_oxc(argument.span()))?;
                semantics.template_source = Some(strip_wrapping_parentheses(template).to_owned());
            }
        }
        _ => {}
    }
    Ok(())
}

fn capture_authoring_const(
    source: &str,
    local_name: &str,
    call: &CallExpression<'_>,
    semantics: &mut AstComponentSemantics,
) -> CompilerResult<()> {
    reject_removed_call(call)?;
    match call_name(call) {
        Some("state") => {
            let Some(initial_value) = call.arguments.first() else {
                return Ok(());
            };
            semantics.states.push(StateDefinition {
                local_name: local_name.to_owned(),
                initial_value: source_span(source, SourceSpan::from_oxc(initial_value.span()))?
                    .trim()
                    .to_owned(),
                kind: StateKind::State,
            });
        }
        Some("computed") => {
            let Some(callback) = call.arguments.first() else {
                return Ok(());
            };
            semantics.computed.push(ComputedDefinition {
                local_name: local_name.to_owned(),
                expression: capture_arrow_expression_source(source, callback)?,
            });
        }
        Some("event") => {
            let Some(event_name) = call.arguments.first().and_then(argument_string_literal) else {
                return Ok(());
            };
            semantics.events.push(EventDefinition {
                local_name: local_name.to_owned(),
                detail_type: call
                    .type_arguments
                    .as_ref()
                    .map(|type_arguments| {
                        source_span(source, SourceSpan::from_oxc(type_arguments.span()))
                            .map(strip_type_argument_delimiters)
                            .map(ToOwned::to_owned)
                    })
                    .transpose()?,
                event_name: event_name.to_owned(),
            });
        }
        Some("formControl") => {
            let Some(options) = call.arguments.first() else {
                return Err(unsupported("formControl() requires an options object."));
            };
            semantics
                .form_controls
                .push(capture_form_control_definition(
                    source, local_name, options,
                )?);
        }
        _ => {}
    }
    Ok(())
}

fn capture_form_control_definition(
    source: &str,
    local_name: &str,
    argument: &Argument<'_>,
) -> CompilerResult<FormControlDefinition> {
    let options_source = source_span(source, SourceSpan::from_oxc(argument.span()))?.trim();
    if !options_source.starts_with('{') || !options_source.ends_with('}') {
        return Err(unsupported(
            "formControl() currently accepts a static object literal.",
        ));
    }
    let properties = &options_source[1..options_source.len() - 1];
    let mut value_expression = None;
    let mut reset_body = None;
    let mut disabled_expression = None;

    for property_source in split_top_level_commas(properties) {
        let property_source = property_source.trim();
        if property_source.is_empty() {
            continue;
        }
        let (name, value) = split_top_level_colon(property_source)
            .map(|(name, value)| (name.trim(), value.trim()))
            .unwrap_or((property_source, property_source));
        match name {
            "value" => {
                value_expression = Some(capture_arrow_expression_source_from_str(value)?);
            }
            "reset" => {
                reset_body = Some(capture_arrow_body_source_from_str(value)?);
            }
            "disabled" => {
                disabled_expression = Some(value.to_owned());
            }
            _ => {}
        }
    }

    let Some(value_expression) = value_expression else {
        return Err(unsupported(
            "formControl() requires a `value` arrow function.",
        ));
    };

    Ok(FormControlDefinition {
        local_name: local_name.to_owned(),
        value_expression,
        reset_body,
        disabled_expression,
    })
}

fn capture_keyed_selector(
    local_name: &str,
    arrow: &ArrowFunctionExpression<'_>,
    semantics: &AstComponentSemantics,
) -> Option<KeyedSelectorDefinition> {
    if !arrow.expression || arrow.params.items.len() != 1 || arrow.params.rest.is_some() {
        return None;
    }
    let parameter_name = binding_identifier_name(&arrow.params.items[0].pattern)?;
    let Statement::ExpressionStatement(statement) = arrow.body.statements.first()? else {
        return None;
    };
    let Expression::BinaryExpression(binary) = &statement.expression else {
        return None;
    };
    let source_name = keyed_selector_source_name(binary, parameter_name, semantics)?;

    Some(KeyedSelectorDefinition {
        local_name: local_name.to_owned(),
        source_name: source_name.to_owned(),
        parameter_name: parameter_name.to_owned(),
    })
}

fn keyed_selector_source_name<'a>(
    binary: &'a BinaryExpression<'a>,
    parameter_name: &str,
    semantics: &'a AstComponentSemantics,
) -> Option<&'a str> {
    if !matches!(binary.operator.as_str(), "==" | "===") {
        return None;
    }

    if expression_identifier_name(&binary.left) == Some(parameter_name) {
        return state_accessor_call_name(&binary.right, semantics);
    }
    if expression_identifier_name(&binary.right) == Some(parameter_name) {
        return state_accessor_call_name(&binary.left, semantics);
    }
    None
}

fn expression_identifier_name<'a>(expression: &'a Expression<'a>) -> Option<&'a str> {
    match expression {
        Expression::Identifier(identifier) => Some(identifier.name.as_str()),
        Expression::ParenthesizedExpression(expression) => {
            expression_identifier_name(&expression.expression)
        }
        _ => None,
    }
}

fn state_accessor_call_name<'a>(
    expression: &'a Expression<'a>,
    semantics: &'a AstComponentSemantics,
) -> Option<&'a str> {
    match expression {
        Expression::CallExpression(call) if call.arguments.is_empty() => {
            let name = call_name(call)?;
            semantics
                .states
                .iter()
                .any(|state| state.local_name == name)
                .then_some(name)
        }
        Expression::ParenthesizedExpression(expression) => {
            state_accessor_call_name(&expression.expression, semantics)
        }
        _ => None,
    }
}

fn binding_identifier_name<'a>(pattern: &'a BindingPattern<'a>) -> Option<&'a str> {
    match pattern {
        BindingPattern::BindingIdentifier(identifier) => Some(identifier.name.as_str()),
        _ => None,
    }
}

fn call_name<'a>(call: &'a CallExpression<'a>) -> Option<&'a str> {
    match &call.callee {
        Expression::Identifier(identifier) => Some(identifier.name.as_str()),
        _ => None,
    }
}

fn reject_removed_call(call: &CallExpression<'_>) -> CompilerResult<()> {
    if call_name(call) == Some("component") {
        return Err(removed_authoring_api_with_span(
            "component() was removed from the v0.1 authoring API. Export a PascalCase function component instead.",
            SourceSpan::from_oxc(call.span).to_diagnostic(),
        ));
    }
    if call_name(call) == Some("signal") {
        return Err(removed_authoring_api_with_span(
            "signal() was removed from the v0.1 authoring API. Use state() for local component state.",
            SourceSpan::from_oxc(call.span).to_diagnostic(),
        ));
    }
    if call_name(call) == Some("useHost") {
        return Err(removed_authoring_api_with_span(
            "useHost() was removed from the v0.1 authoring API. Use host() instead.",
            SourceSpan::from_oxc(call.span).to_diagnostic(),
        ));
    }
    if is_prop_call(call) {
        return Err(removed_authoring_api_with_span(
            "prop.*() and prop() were removed from the v0.1 authoring API. Declare props with typed function parameters instead.",
            SourceSpan::from_oxc(call.span).to_diagnostic(),
        ));
    }
    Ok(())
}

fn is_prop_call(call: &CallExpression<'_>) -> bool {
    if call_name(call) == Some("prop") {
        return true;
    }
    let Expression::StaticMemberExpression(member) = &call.callee else {
        return false;
    };
    matches!(&member.object, Expression::Identifier(identifier) if identifier.name.as_str() == "prop")
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

fn argument_string_literal<'a>(argument: &'a Argument<'a>) -> Option<&'a str> {
    match argument {
        Argument::StringLiteral(literal) => Some(literal.value.as_str()),
        _ => None,
    }
}

fn capture_arrow_expression_source(
    source: &str,
    argument: &Argument<'_>,
) -> CompilerResult<String> {
    let callback_source = source_span(source, SourceSpan::from_oxc(argument.span()))?;
    let callback_span = SourceSpan::from_oxc(argument.span()).to_diagnostic();
    capture_arrow_expression_source_from_str_with_span(callback_source, Some(callback_span))
}

fn capture_arrow_expression_source_from_str(callback_source: &str) -> CompilerResult<String> {
    capture_arrow_expression_source_from_str_with_span(callback_source, None)
}

fn capture_arrow_expression_source_from_str_with_span(
    callback_source: &str,
    callback_span: Option<DiagnosticSpan>,
) -> CompilerResult<String> {
    let Some(arrow_index) = callback_source.find("=>") else {
        return Err(unsupported_with_optional_span(
            DIAGNOSTIC_CODE_UNSUPPORTED_COMPUTED_CALLBACK,
            "computed() requires an arrow function callback.",
            DIAGNOSTIC_HINT_AUTHORING_LIMITATIONS,
            callback_span,
        ));
    };
    let body = callback_source[arrow_index + 2..].trim();
    if body.starts_with('{') {
        return Err(unsupported_with_optional_span(
            DIAGNOSTIC_CODE_UNSUPPORTED_COMPUTED_CALLBACK,
            "computed() must use an expression body in the current compiler milestone.",
            DIAGNOSTIC_HINT_AUTHORING_LIMITATIONS,
            callback_span,
        ));
    }
    Ok(strip_wrapping_parentheses(body).to_owned())
}

fn capture_arrow_body_source(source: &str, argument: &Argument<'_>) -> CompilerResult<String> {
    let callback_source = source_span(source, SourceSpan::from_oxc(argument.span()))?;
    let callback_span = SourceSpan::from_oxc(argument.span()).to_diagnostic();
    capture_arrow_body_source_from_str_with_span(callback_source, Some(callback_span))
}

fn capture_arrow_body_source_from_str(callback_source: &str) -> CompilerResult<String> {
    capture_arrow_body_source_from_str_with_span(callback_source, None)
}

fn capture_arrow_body_source_from_str_with_span(
    callback_source: &str,
    callback_span: Option<DiagnosticSpan>,
) -> CompilerResult<String> {
    let Some(arrow_index) = callback_source.find("=>") else {
        return Err(unsupported(
            "Iktia compiler helpers require an arrow function callback.",
        ));
    };
    let body = callback_source[arrow_index + 2..].trim();
    if body.starts_with('{') {
        if !body.ends_with('}') || body.len() < 2 {
            return Err(unsupported_with_optional_span(
                DIAGNOSTIC_CODE_UNSUPPORTED_EFFECT_CALLBACK,
                "effect() callback body is malformed.",
                DIAGNOSTIC_HINT_AUTHORING_LIMITATIONS,
                callback_span,
            ));
        }
        return Ok(body[1..body.len() - 1].trim().to_owned());
    }
    Ok(format!("return {};", strip_wrapping_parentheses(body)))
}

fn unsupported_with_optional_span(
    code: &'static str,
    message: impl Into<String>,
    hint: &'static str,
    span: Option<DiagnosticSpan>,
) -> CompilerError {
    let message = message.into();
    match span {
        Some(span) => unsupported_with_code_and_span(code, message, hint, span),
        None => unsupported_with_code(code, message, hint),
    }
}

fn split_top_level_commas(source: &str) -> Vec<&str> {
    split_top_level(source, ',')
}

fn split_top_level_colon(source: &str) -> Option<(&str, &str)> {
    split_top_level_once(source, ':')
}

fn split_top_level(source: &str, delimiter: char) -> Vec<&str> {
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
        } else if ch == delimiter && depth == 0 {
            parts.push(&source[start..index]);
            start = index + ch.len_utf8();
        }
    }

    parts.push(&source[start..]);
    parts
}

fn split_top_level_once(source: &str, delimiter: char) -> Option<(&str, &str)> {
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
        } else if ch == delimiter && depth == 0 {
            return Some((&source[..index], &source[index + ch.len_utf8()..]));
        }
    }

    None
}

fn source_span(source: &str, span: SourceSpan) -> CompilerResult<&str> {
    source
        .get(span.start..span.end)
        .ok_or_else(|| unsupported("OXC AST span did not align with source text."))
}

fn strip_wrapping_parentheses(source: &str) -> &str {
    let trimmed = source.trim();
    if trimmed.starts_with('(') && trimmed.ends_with(')') {
        return trimmed[1..trimmed.len() - 1].trim();
    }
    trimmed
}

fn strip_type_argument_delimiters(source: &str) -> &str {
    let trimmed = source.trim();
    if trimmed.starts_with('<') && trimmed.ends_with('>') {
        return trimmed[1..trimmed.len() - 1].trim();
    }
    trimmed
}
