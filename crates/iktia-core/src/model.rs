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
    /// Public props declared through function parameters or `prop.*()`.
    pub props: Vec<PropDefinition>,
    /// Internal state declarations.
    pub states: Vec<StateDefinition>,
    /// Pure derived value declarations.
    pub computed: Vec<ComputedDefinition>,
    /// Lifecycle side effect declarations.
    pub effects: Vec<EffectDefinition>,
    /// Whether the component body references `host()` or `useHost()`.
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
    /// Legacy `prop.*()` declarations expose accessor functions.
    Accessor,
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

/// State-like reactive authoring declaration.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum StateKind {
    /// Legacy `state()` declaration.
    State,
    /// Preferred v2 `signal()` declaration.
    Signal,
}

/// Pure derived value declaration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ComputedDefinition {
    /// Local variable name used in the component callback.
    pub local_name: String,
    /// Source text for the derived value expression.
    pub expression: String,
}

/// Lifecycle side effect declaration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EffectDefinition {
    /// Source text for the effect callback body.
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

/// Result of transforming a source module.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TransformResult {
    /// Generated JavaScript module source.
    pub code: String,
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
