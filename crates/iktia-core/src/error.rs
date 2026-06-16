use thiserror::Error;

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
        /// Human-readable diagnostic message.
        message: String,
    },
}
