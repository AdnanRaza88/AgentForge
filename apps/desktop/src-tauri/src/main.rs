// AgentForge Desktop shell entry point.
// This is intentionally minimal: Tauri loads the built apps/web frontend
// (see ../tauri.conf.json → build.frontendDist) inside a native WebView.
// The AgentForge core engine runs as the same Node process that powers
// apps/web/server; Tauri just gives it a native window + installer for
// Windows distribution (docs/03-TECH-SPEC.md §9).

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running AgentForge desktop application");
}
