#![warn(missing_docs, rustdoc::broken_intra_doc_links)]
//! Node.js binding surface for the Iktia compiler.

use napi_derive::napi;

fn to_napi_error(error: iktia_core::CompilerError) -> napi::Error {
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
        core_version: iktia_core::core_version().to_string(),
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

/// Request passed to the native Declarative Shadow DOM prerender workflow.
#[napi(object)]
pub struct NativeDeclarativeShadowDomRequest {
    /// Original TypeScript/TSX source.
    pub source: String,
    /// Filename used for parser source-type detection and diagnostics.
    pub filename: String,
    /// Optional JSON object containing initial prop values.
    pub props_json: Option<String>,
}

/// Result returned by the native Declarative Shadow DOM prerender workflow.
#[napi(object)]
pub struct NativeDeclarativeShadowDomResult {
    /// Custom element tag name, for example `x-counter`.
    pub tag_name: String,
    /// Generated JavaScript class name.
    pub class_name: String,
    /// Public authoring export name for function components.
    pub export_name: Option<String>,
    /// Full custom element host HTML.
    pub html: String,
    /// Serialized `<template shadowrootmode="open">` fragment.
    pub template_html: String,
    /// Whether the component renders into a shadow root.
    pub shadow: bool,
    /// Whether the result includes Declarative Shadow DOM.
    pub uses_declarative_shadow_dom: bool,
}

/// Transforms an Iktia component module into native Custom Element source.
///
/// # Errors
///
/// Returns a Node error when parsing, analysis, or code generation fails.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn transform_component(request: NativeTransformRequest) -> napi::Result<NativeTransformResult> {
    iktia_core::transform_component_module(&request.source, &request.filename)
        .map(|result| NativeTransformResult {
            code: result.code,
            has_changed: result.has_changed,
        })
        .map_err(to_napi_error)
}

/// Prerenders an Iktia component module as Declarative Shadow DOM host HTML.
///
/// # Errors
///
/// Returns a Node error when parsing, analysis, or serialization fails.
#[napi]
#[allow(clippy::needless_pass_by_value)]
pub fn render_declarative_shadow_dom(
    request: NativeDeclarativeShadowDomRequest,
) -> napi::Result<NativeDeclarativeShadowDomResult> {
    iktia_core::render_declarative_shadow_dom_module(
        &request.source,
        &request.filename,
        request.props_json.as_deref(),
    )
    .map(|result| NativeDeclarativeShadowDomResult {
        tag_name: result.tag_name,
        class_name: result.class_name,
        export_name: result.export_name,
        html: result.html,
        template_html: result.template_html,
        shadow: result.shadow,
        uses_declarative_shadow_dom: result.uses_declarative_shadow_dom,
    })
    .map_err(to_napi_error)
}
