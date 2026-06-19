use thiserror::Error;

use crate::model::{CompilerDiagnostic, DiagnosticSeverity};

pub(crate) const DIAGNOSTIC_HINT_AUTHORING_LIMITATIONS: &str =
    "Check the v0.1 authoring limitations for supported TSX.";
pub(crate) const DIAGNOSTIC_HINT_COMPONENT_OPTIONS: &str =
    "Use `export const options = { styles: [...] } satisfies ComponentOptions`.";
pub(crate) const DIAGNOSTIC_HINT_DSD_INPUTS: &str =
    "Pass JSON objects for DSD props and inline styles.";
pub(crate) const DIAGNOSTIC_HINT_FUNCTION_COMPONENT: &str =
    "Export a PascalCase function component with a parenthesized TSX return value.";
pub(crate) const DIAGNOSTIC_HINT_FUNCTION_PROPS: &str =
    "Declare explicit destructured props with defaults.";
pub(crate) const DIAGNOSTIC_HINT_LISTS: &str =
    "Use a keyed .map() expression or <For> child that returns one JSX element.";
pub(crate) const DIAGNOSTIC_HINT_REMOVED_API: &str =
    "Use the v0.1 function component authoring API instead.";
pub(crate) const DIAGNOSTIC_HINT_SHOW: &str =
    "Use explicit <Show when={...} fallback={...}> control flow.";

pub(crate) const DIAGNOSTIC_CODE_DSD_INPUT: &str = "IKTIA_DSD_INPUT";
pub(crate) const DIAGNOSTIC_CODE_COMPONENT_TEMPLATE_REQUIRED: &str =
    "IKTIA_COMPONENT_TEMPLATE_REQUIRED";
pub(crate) const DIAGNOSTIC_CODE_REMOVED_AUTHORING_API: &str = "IKTIA_REMOVED_AUTHORING_API";
pub(crate) const DIAGNOSTIC_CODE_TEMPLATE_PARSE: &str = "IKTIA_TEMPLATE_PARSE";
pub(crate) const DIAGNOSTIC_CODE_UNSUPPORTED_COMPONENT_OPTIONS: &str =
    "IKTIA_UNSUPPORTED_COMPONENT_OPTIONS";
pub(crate) const DIAGNOSTIC_CODE_UNSUPPORTED_CONDITIONAL_JSX: &str =
    "IKTIA_UNSUPPORTED_CONDITIONAL_JSX";
pub(crate) const DIAGNOSTIC_CODE_UNSUPPORTED_COMPUTED_CALLBACK: &str =
    "IKTIA_UNSUPPORTED_COMPUTED_CALLBACK";
pub(crate) const DIAGNOSTIC_CODE_UNSUPPORTED_EFFECT_CALLBACK: &str =
    "IKTIA_UNSUPPORTED_EFFECT_CALLBACK";
pub(crate) const DIAGNOSTIC_CODE_UNSUPPORTED_FUNCTION_PROPS: &str =
    "IKTIA_UNSUPPORTED_FUNCTION_PROPS";
pub(crate) const DIAGNOSTIC_CODE_UNSUPPORTED_LIST_RENDERER: &str =
    "IKTIA_UNSUPPORTED_LIST_RENDERER";
pub(crate) const DIAGNOSTIC_CODE_UNSUPPORTED_SHOW_FALLBACK: &str =
    "IKTIA_UNSUPPORTED_SHOW_FALLBACK";
pub(crate) const DIAGNOSTIC_CODE_UNSUPPORTED_SYNTAX: &str = "IKTIA_UNSUPPORTED_SYNTAX";

/// Shared result type for compiler operations.
pub type CompilerResult<T> = Result<T, CompilerError>;

/// Error type for host-neutral compiler failures.
#[derive(Debug, Error)]
pub enum CompilerError {
    /// The TypeScript/TSX parser rejected the module.
    #[error("Parse error in {filename}: {messages}")]
    ParseModuleSource {
        /// Module filename presented to the parser.
        filename: String,
        /// Joined parser diagnostics.
        messages: String,
    },
    /// No supported component declaration could be found.
    #[error("No Iktia component declaration was found in {filename}.")]
    ComponentNotFound {
        /// Module filename being analyzed.
        filename: String,
    },
    /// A static compiler pattern failed to compile.
    #[error("Internal compiler pattern failed to compile: {pattern}: {source}")]
    InternalPattern {
        /// Regex pattern used by the compiler.
        pattern: &'static str,
        /// Regex compilation failure.
        #[source]
        source: regex::Error,
    },
    /// The requested compiler feature is not implemented yet.
    #[error("{message}")]
    Unsupported {
        /// Stable diagnostic code.
        code: &'static str,
        /// Optional remediation hint.
        hint: &'static str,
        /// Human-readable diagnostic message.
        message: String,
    },
}

impl CompilerError {
    /// Converts this compiler error into structured diagnostics.
    #[must_use]
    pub fn diagnostics(&self, fallback_filename: &str) -> Vec<CompilerDiagnostic> {
        vec![match self {
            Self::ParseModuleSource { filename, messages } => CompilerDiagnostic {
                code: "IKTIA_PARSE_MODULE_SOURCE".to_owned(),
                filename: filename.clone(),
                hint: Some("Fix the TypeScript/TSX syntax before Iktia analysis runs.".to_owned()),
                message: messages.clone(),
                severity: DiagnosticSeverity::Error,
                span: None,
            },
            Self::ComponentNotFound { filename } => CompilerDiagnostic {
                code: "IKTIA_COMPONENT_NOT_FOUND".to_owned(),
                filename: filename.clone(),
                hint: Some(
                    "Export a supported function component from a .wc.tsx module.".to_owned(),
                ),
                message: self.to_string(),
                severity: DiagnosticSeverity::Error,
                span: None,
            },
            Self::InternalPattern { .. } => CompilerDiagnostic {
                code: "IKTIA_INTERNAL_PATTERN".to_owned(),
                filename: fallback_filename.to_owned(),
                hint: Some("Report this as an Iktia compiler bug.".to_owned()),
                message: self.to_string(),
                severity: DiagnosticSeverity::Error,
                span: None,
            },
            Self::Unsupported {
                code,
                hint,
                message,
            } => CompilerDiagnostic {
                code: (*code).to_owned(),
                filename: fallback_filename.to_owned(),
                hint: Some((*hint).to_owned()),
                message: message.clone(),
                severity: DiagnosticSeverity::Error,
                span: None,
            },
        }]
    }
}

pub(crate) fn dsd_input(message: impl Into<String>) -> CompilerError {
    unsupported_with_code(
        DIAGNOSTIC_CODE_DSD_INPUT,
        message,
        DIAGNOSTIC_HINT_DSD_INPUTS,
    )
}

pub(crate) fn removed_authoring_api(message: impl Into<String>) -> CompilerError {
    unsupported_with_code(
        DIAGNOSTIC_CODE_REMOVED_AUTHORING_API,
        message,
        DIAGNOSTIC_HINT_REMOVED_API,
    )
}

pub(crate) fn template_parse(message: impl Into<String>) -> CompilerError {
    unsupported_with_code(
        DIAGNOSTIC_CODE_TEMPLATE_PARSE,
        message,
        DIAGNOSTIC_HINT_AUTHORING_LIMITATIONS,
    )
}

pub(crate) fn unsupported(message: impl Into<String>) -> CompilerError {
    unsupported_with_code(
        DIAGNOSTIC_CODE_UNSUPPORTED_SYNTAX,
        message,
        DIAGNOSTIC_HINT_AUTHORING_LIMITATIONS,
    )
}

pub(crate) fn unsupported_with_code(
    code: &'static str,
    message: impl Into<String>,
    hint: &'static str,
) -> CompilerError {
    CompilerError::Unsupported {
        code,
        hint,
        message: message.into(),
    }
}
