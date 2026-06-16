use serde::{Deserialize, Serialize};

/// Statically analyzed component module.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ComponentModule {
    /// Custom element tag name, for example `x-counter`.
    pub tag_name: String,
    /// JavaScript class name derived from the tag name.
    pub class_name: String,
    /// Component options captured from the `component()` call.
    pub options: ComponentOptions,
    /// Public props declared through `prop.*()`.
    pub props: Vec<PropDefinition>,
    /// Internal state declarations.
    pub states: Vec<StateDefinition>,
    /// Custom event declarations.
    pub events: Vec<EventDefinition>,
    /// Raw JSX template returned by the component callback.
    pub template_source: String,
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

/// Public prop declaration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PropDefinition {
    /// Local variable name used in the component callback.
    pub local_name: String,
    /// Public prop name.
    pub prop_name: String,
    /// Attribute conversion kind.
    pub kind: PropKind,
    /// Source text for the default value.
    pub default_value: String,
}

/// Internal state declaration.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StateDefinition {
    /// Local variable name used in the component callback.
    pub local_name: String,
    /// Source text for the initial value.
    pub initial_value: String,
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
