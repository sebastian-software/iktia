#![warn(missing_docs, rustdoc::broken_intra_doc_links)]
//! Node.js binding surface for the lean-wc compiler.

use napi_derive::napi;

fn to_napi_error(error: lean_wc_core::CompilerError) -> napi::Error {
    napi::Error::from_reason(error.to_string())
}

/// Version metadata for the loaded native compiler.
#[napi(object)]
pub struct NativeInfo {
    /// Current Rust compiler core package version.
    pub core_version: String,
}

/// Returns metadata for the native compiler.
#[napi]
#[must_use]
pub fn get_native_info() -> NativeInfo {
    NativeInfo {
        core_version: lean_wc_core::core_version().to_string(),
    }
}

/// Request passed to the native component transform workflow.
#[napi(object)]
pub struct NativeTransformRequest {
    /// Original TypeScript/TSX source.
    pub source: String,
    /// Filename used for parser source-type detection and diagnostics.
    pub filename: String,
}

/// Result returned by the native component transform workflow.
#[napi(object)]
pub struct NativeTransformResult {
    /// Generated JavaScript module source.
    pub code: String,
    /// Whether the compiler changed the input module.
    pub has_changed: bool,
}

/// Transforms a lean-wc component module into native Custom Element source.
///
/// # Errors
///
/// Returns a Node error when parsing, analysis, or code generation fails.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn transform_component(request: NativeTransformRequest) -> napi::Result<NativeTransformResult> {
    lean_wc_core::transform_component_module(&request.source, &request.filename)
        .map(|result| NativeTransformResult {
            code: result.code,
            has_changed: result.has_changed,
        })
        .map_err(to_napi_error)
}
