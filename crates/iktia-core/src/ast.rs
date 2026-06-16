use oxc_allocator::Allocator;
use oxc_ast::ast::{
    Argument, BindingPattern, CallExpression, Declaration, ExportDefaultDeclarationKind,
    Expression, Function, FunctionBody, ImportDeclarationSpecifier, ImportOrExportKind,
    ModuleExportName, Program, Statement, VariableDeclarationKind,
};
use oxc_parser::Parser;
use oxc_span::{GetSpan, SourceType, Span};

use crate::error::{CompilerError, CompilerResult};
use crate::model::{
    ComponentImport, ComputedDefinition, EffectDefinition, EventDefinition, StateDefinition,
    StateKind,
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
}

#[derive(Debug, Clone, Default)]
pub(crate) struct AstComponentSemantics {
    pub(crate) states: Vec<StateDefinition>,
    pub(crate) computed: Vec<ComputedDefinition>,
    pub(crate) effects: Vec<EffectDefinition>,
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

#[derive(Debug, Clone)]
pub(crate) struct AstLegacyComponent {
    pub(crate) call: SourceSpan,
    pub(crate) semantics: Option<AstComponentSemantics>,
}

#[derive(Debug, Default)]
pub(crate) struct AstModuleFacts {
    pub(crate) component_imports: Vec<ComponentImport>,
    pub(crate) function_components: Vec<AstFunctionComponent>,
    pub(crate) legacy_component: Option<AstLegacyComponent>,
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
                ExportDefaultDeclarationKind::CallExpression(call) => {
                    capture_legacy_component_call(self.source, call, facts)?;
                }
                _ => {}
            },
            Statement::ExpressionStatement(statement) => {
                if let Expression::CallExpression(call) = &statement.expression {
                    capture_legacy_component_call(self.source, call, facts)?;
                }
            }
            _ => {}
        }
        Ok(())
    }
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

fn capture_legacy_component_call(
    source: &str,
    call: &CallExpression<'_>,
    facts: &mut AstModuleFacts,
) -> CompilerResult<()> {
    let Expression::Identifier(callee) = &call.callee else {
        return Ok(());
    };
    if callee.name.as_str() != "component" {
        return Ok(());
    }
    facts.legacy_component = Some(AstLegacyComponent {
        call: SourceSpan::from_oxc(call.span),
        semantics: capture_component_callback(source, call)?,
    });
    Ok(())
}

fn capture_component_callback(
    source: &str,
    call: &CallExpression<'_>,
) -> CompilerResult<Option<AstComponentSemantics>> {
    let Some(callback) = call.arguments.get(2) else {
        return Ok(None);
    };
    let Argument::ArrowFunctionExpression(callback) = callback else {
        return Ok(None);
    };
    Ok(Some(analyze_component_body(source, &callback.body)?))
}

fn analyze_component_body(
    source: &str,
    body: &FunctionBody<'_>,
) -> CompilerResult<AstComponentSemantics> {
    let mut semantics = AstComponentSemantics::default();
    let body_source = source_span(source, SourceSpan::from_oxc(body.span))?;
    semantics.uses_host_helpers = body_source.contains("host(") || body_source.contains("useHost(");

    for statement in &body.statements {
        capture_body_statement(source, statement, &mut semantics)?;
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
                let Some(Expression::CallExpression(call)) = &declarator.init else {
                    continue;
                };
                capture_authoring_const(source, local_name, call, semantics)?;
            }
        }
        Statement::ExpressionStatement(statement) => {
            if let Expression::CallExpression(call) = &statement.expression
                && call_name(call) == Some("effect")
                && let Some(callback) = call.arguments.first()
            {
                semantics.effects.push(EffectDefinition {
                    body: capture_arrow_body_source(source, callback)?,
                });
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
    match call_name(call) {
        Some("state") | Some("signal") => {
            let Some(initial_value) = call.arguments.first() else {
                return Ok(());
            };
            semantics.states.push(StateDefinition {
                local_name: local_name.to_owned(),
                initial_value: source_span(source, SourceSpan::from_oxc(initial_value.span()))?
                    .trim()
                    .to_owned(),
                kind: if call_name(call) == Some("signal") {
                    StateKind::Signal
                } else {
                    StateKind::State
                },
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
        _ => {}
    }
    Ok(())
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
    let Some(arrow_index) = callback_source.find("=>") else {
        return Err(unsupported(
            "computed() requires an arrow function callback.",
        ));
    };
    let body = callback_source[arrow_index + 2..].trim();
    if body.starts_with('{') {
        return Err(unsupported(
            "computed() must use an expression body in the current compiler milestone.",
        ));
    }
    Ok(strip_wrapping_parentheses(body).to_owned())
}

fn capture_arrow_body_source(source: &str, argument: &Argument<'_>) -> CompilerResult<String> {
    let callback_source = source_span(source, SourceSpan::from_oxc(argument.span()))?;
    let Some(arrow_index) = callback_source.find("=>") else {
        return Err(unsupported("effect() requires an arrow function callback."));
    };
    let body = callback_source[arrow_index + 2..].trim();
    if body.starts_with('{') {
        if !body.ends_with('}') || body.len() < 2 {
            return Err(unsupported("effect() callback body is malformed."));
        }
        return Ok(body[1..body.len() - 1].trim().to_owned());
    }
    Ok(format!("return {};", strip_wrapping_parentheses(body)))
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

fn unsupported(message: impl Into<String>) -> CompilerError {
    CompilerError::Unsupported {
        message: message.into(),
    }
}
