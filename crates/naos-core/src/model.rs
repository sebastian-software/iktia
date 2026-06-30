use serde::{Deserialize, Serialize};

/// Statically analyzed component module.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ComponentModule {
    /// Custom element tag name, for example `x-counter`.
    pub tag_name: String,
    /// JavaScript class name derived from the tag name.
    pub class_name: String,
    /// Public authoring export name, when the source used function component syntax.
    pub export_name: Option<String>,
    /// Component options captured from the component declaration.
    pub options: ComponentOptions,
    /// Component imports that should be preserved for nested Custom Element registration.
    pub component_imports: Vec<ComponentImport>,
    /// Runtime imports preserved for helper functions used in generated code.
    pub runtime_imports: Vec<RuntimeImport>,
    /// Inline CSS imports referenced by component styles.
    pub style_imports: Vec<StyleImport>,
    /// Public props declared through function parameters.
    pub props: Vec<PropDefinition>,
    /// Internal state declarations.
    pub states: Vec<StateDefinition>,
    /// Form-associated custom element declaration.
    pub form_controls: Vec<FormControlDefinition>,
    /// Pure derived value declarations.
    pub computed: Vec<ComputedDefinition>,
    /// Compiler-recognized keyed boolean selector declarations.
    pub keyed_selectors: Vec<KeyedSelectorDefinition>,
    /// Lifecycle side effect declarations.
    pub effects: Vec<EffectDefinition>,
    /// Connected lifecycle callbacks.
    pub connected_callbacks: Vec<LifecycleCallbackDefinition>,
    /// Disconnected lifecycle callbacks.
    pub disconnected_callbacks: Vec<LifecycleCallbackDefinition>,
    /// Whether the component body references `host()`.
    pub uses_host_helpers: bool,
    /// Custom event declarations.
    pub events: Vec<EventDefinition>,
    /// Raw JSX template returned by the component callback.
    pub template_source: String,
}

/// Imported component used as a PascalCase JSX element.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ComponentImport {
    /// Imported export name from the source module.
    pub imported_name: String,
    /// Local binding name used in the current module.
    pub local_name: String,
    /// Import source specifier.
    pub source: String,
}

/// Runtime import that should be preserved in generated output.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RuntimeImport {
    /// Raw import declaration source.
    pub source: String,
}

/// Imported `?inline` style text binding.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StyleImport {
    /// Local binding name used in `ComponentOptions.styles`.
    pub local_name: String,
    /// Import source specifier.
    pub source: String,
}

/// Component-level compile options.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ComponentOptions {
    /// Whether the generated component should attach a shadow root.
    pub shadow: bool,
    /// Whether the generated module should call `customElements.define()`.
    pub define: bool,
    /// Style source expressions injected into the shadow root.
    pub styles: Vec<String>,
}

impl Default for ComponentOptions {
    fn default() -> Self {
        Self {
            shadow: true,
            define: true,
            styles: Vec::new(),
        }
    }
}

/// Supported prop conversion kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PropKind {
    /// String-valued prop.
    String,
    /// Boolean-valued prop.
    Boolean,
    /// Number-valued prop.
    Number,
}

/// How a prop is exposed inside the authored template.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PropAccess {
    /// Function component parameters expose plain local values.
    Value,
}

/// Public prop declaration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PropDefinition {
    /// Local variable name used in the component callback.
    pub local_name: String,
    /// Public prop name.
    pub prop_name: String,
    /// Observed HTML attribute name.
    pub attribute_name: String,
    /// Attribute conversion kind.
    pub kind: PropKind,
    /// Source text for the default value.
    pub default_value: String,
    /// Whether the authored template reads this prop as a value or accessor.
    pub access: PropAccess,
}

/// Internal state declaration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StateDefinition {
    /// Local variable name used in the component callback.
    pub local_name: String,
    /// Source text for the initial value.
    pub initial_value: String,
    /// Authoring function used for this reactive value.
    pub kind: StateKind,
}

/// Form-associated custom element declaration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct FormControlDefinition {
    /// Local variable name used in the component callback.
    pub local_name: String,
    /// Expression passed to `ElementInternals.setFormValue()`.
    pub value_expression: String,
    /// Optional reset callback body.
    pub reset_body: Option<String>,
    /// Optional prop/local expression used for disabled reflection.
    pub disabled_expression: Option<String>,
}

/// Local reactive authoring declaration.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum StateKind {
    /// Public `state()` declaration.
    State,
}

/// Pure derived value declaration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ComputedDefinition {
    /// Local variable name used in the component callback.
    pub local_name: String,
    /// Source text for the derived value expression.
    pub expression: String,
}

/// Local keyed selector helper that compares a state value with a key.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct KeyedSelectorDefinition {
    /// Local selector helper name, for example `isSelected`.
    pub local_name: String,
    /// State accessor that drives the selector.
    pub source_name: String,
    /// Key parameter name accepted by the selector helper.
    pub parameter_name: String,
}

/// Lifecycle side effect declaration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EffectDefinition {
    /// Source text for the effect callback body.
    pub body: String,
}

/// Custom element lifecycle callback declaration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LifecycleCallbackDefinition {
    /// Source text for the lifecycle callback body.
    pub body: String,
}

/// Custom event declaration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EventDefinition {
    /// Local variable name used in the component callback.
    pub local_name: String,
    /// Custom event name.
    pub event_name: String,
    /// TypeScript detail type source, when provided.
    pub detail_type: Option<String>,
}

/// Compiler diagnostic severity.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DiagnosticSeverity {
    /// Informational diagnostic.
    Info,
    /// Warning diagnostic.
    Warning,
    /// Error diagnostic.
    Error,
}

/// UTF-8 byte span in the original source.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiagnosticSpan {
    /// Inclusive UTF-8 byte offset.
    pub start: usize,
    /// Exclusive UTF-8 byte offset.
    pub end: usize,
}

/// Structured compiler diagnostic.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CompilerDiagnostic {
    /// Stable diagnostic code.
    pub code: String,
    /// Diagnostic severity.
    pub severity: DiagnosticSeverity,
    /// Human-readable message.
    pub message: String,
    /// Source filename.
    pub filename: String,
    /// Optional UTF-8 source span.
    pub span: Option<DiagnosticSpan>,
    /// Optional remediation hint.
    pub hint: Option<String>,
}

/// Source map returned by the native compiler transform.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceMap {
    /// Source map version.
    pub version: u8,
    /// Generated output filename.
    pub file: String,
    /// Original source filenames.
    pub sources: Vec<String>,
    /// Original source text.
    pub sources_content: Vec<String>,
    /// Symbol names referenced by mappings.
    pub names: Vec<String>,
    /// Source map v3 VLQ mappings.
    pub mappings: String,
}

/// Result of transforming a source module.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TransformResult {
    /// Generated JavaScript module source.
    pub code: String,
    /// Source map generated by the Rust compiler.
    pub map: Option<SourceMap>,
    /// Whether the compiler changed the input module.
    pub has_changed: bool,
}

/// Result of prerendering a component as Declarative Shadow DOM HTML.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeclarativeShadowDomRenderResult {
    /// Custom element tag name, for example `x-counter`.
    pub tag_name: String,
    /// JavaScript class name generated for the component.
    pub class_name: String,
    /// Public authoring export name, when the source used function syntax.
    pub export_name: Option<String>,
    /// Full host HTML containing the declarative shadow template when enabled.
    pub html: String,
    /// The serialized `<template shadowrootmode="open">` fragment, if emitted.
    pub template_html: String,
    /// Whether the component renders into a shadow root.
    pub shadow: bool,
    /// Whether this result used Declarative Shadow DOM output.
    pub uses_declarative_shadow_dom: bool,
}
