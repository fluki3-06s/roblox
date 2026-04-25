use aes_gcm::aead::{Aead, OsRng};
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
mod recoil;
use recoil::{EngineStatus, RecoilEngine};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use tauri::{
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

const SECURE_SETTINGS_FILE: &str = "system-settings.secure";

#[derive(Serialize, Deserialize)]
struct EncryptedSettingsFile {
  version: u8,
  nonce: String,
  payload: String,
}

fn settings_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let app_data_dir = app
    .path()
    .app_data_dir()
    .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
  fs::create_dir_all(&app_data_dir)
    .map_err(|error| format!("failed to create app data dir: {error}"))?;
  Ok(app_data_dir.join(SECURE_SETTINGS_FILE))
}

fn derive_key(app: &tauri::AppHandle) -> Result<[u8; 32], String> {
  let app_data_dir = app
    .path()
    .app_data_dir()
    .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
  let identity_material = format!(
    "{}|{}|{}|{}",
    app.config().identifier,
    app_data_dir.display(),
    whoami::username(),
    "pubg-desktop-ui-secure-v1"
  );
  let mut hasher = Sha256::new();
  hasher.update(identity_material.as_bytes());
  let digest = hasher.finalize();
  let mut key = [0_u8; 32];
  key.copy_from_slice(&digest[..32]);
  Ok(key)
}

#[tauri::command]
fn save_secure_settings(app: tauri::AppHandle, payload: String) -> Result<(), String> {
  let key = derive_key(&app)?;
  let cipher = Aes256Gcm::new_from_slice(&key).map_err(|error| format!("cipher init failed: {error}"))?;

  let mut nonce_bytes = [0_u8; 12];
  use aes_gcm::aead::rand_core::RngCore as _;
  OsRng.fill_bytes(&mut nonce_bytes);
  let nonce = Nonce::from_slice(&nonce_bytes);

  let encrypted = cipher
    .encrypt(nonce, payload.as_bytes())
    .map_err(|_| String::from("encrypt settings failed"))?;

  let file_data = EncryptedSettingsFile {
    version: 1,
    nonce: BASE64.encode(nonce_bytes),
    payload: BASE64.encode(encrypted),
  };

  let encoded =
    serde_json::to_vec(&file_data).map_err(|error| format!("encode settings failed: {error}"))?;
  let path = settings_file_path(&app)?;
  fs::write(path, encoded).map_err(|error| format!("write settings failed: {error}"))?;
  Ok(())
}

#[tauri::command]
fn load_secure_settings(app: tauri::AppHandle) -> Result<Option<String>, String> {
  let path = settings_file_path(&app)?;
  if !path.exists() {
    return Ok(None);
  }

  let raw = fs::read(path).map_err(|error| format!("read settings failed: {error}"))?;
  let file_data: EncryptedSettingsFile =
    serde_json::from_slice(&raw).map_err(|error| format!("decode settings failed: {error}"))?;

  if file_data.version != 1 {
    return Err(String::from("unsupported settings version"));
  }

  let nonce_bytes = BASE64
    .decode(file_data.nonce.as_bytes())
    .map_err(|error| format!("decode nonce failed: {error}"))?;
  let payload_bytes = BASE64
    .decode(file_data.payload.as_bytes())
    .map_err(|error| format!("decode payload failed: {error}"))?;

  if nonce_bytes.len() != 12 {
    return Err(String::from("invalid nonce length"));
  }

  let key = derive_key(&app)?;
  let cipher = Aes256Gcm::new_from_slice(&key).map_err(|error| format!("cipher init failed: {error}"))?;
  let decrypted = cipher
    .decrypt(Nonce::from_slice(&nonce_bytes), payload_bytes.as_ref())
    .map_err(|_| String::from("decrypt settings failed"))?;

  let as_text = String::from_utf8(decrypted).map_err(|error| format!("settings utf8 invalid: {error}"))?;
  Ok(Some(as_text))
}

#[tauri::command]
fn recoil_start(engine: tauri::State<'_, RecoilEngine>) -> Result<(), String> {
  engine.start()
}

#[tauri::command]
fn recoil_stop(engine: tauri::State<'_, RecoilEngine>) -> Result<(), String> {
  engine.stop()
}

#[tauri::command]
fn recoil_set_enabled(engine: tauri::State<'_, RecoilEngine>, enabled: bool) -> Result<(), String> {
  engine.set_enabled(enabled)
}

#[tauri::command]
fn recoil_toggle_enabled(engine: tauri::State<'_, RecoilEngine>) -> Result<bool, String> {
  engine.toggle_enabled()
}

#[tauri::command]
fn recoil_set_scope(engine: tauri::State<'_, RecoilEngine>, scope: String) -> Result<(), String> {
  engine.set_scope(&scope)
}

#[tauri::command]
fn recoil_update_settings(
  engine: tauri::State<'_, RecoilEngine>,
  global_scale: f64,
  step_interval_ms: f64,
) -> Result<(), String> {
  engine.set_settings(global_scale, step_interval_ms)
}

#[tauri::command]
fn recoil_update_hotkeys(
  engine: tauri::State<'_, RecoilEngine>,
  hotkeys: HashMap<String, String>,
) -> Result<(), String> {
  engine.set_hotkeys(hotkeys)
}

#[tauri::command]
fn recoil_status(engine: tauri::State<'_, RecoilEngine>) -> Result<EngineStatus, String> {
  engine.status()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let recoil_engine = RecoilEngine::default();
  tauri::Builder::default()
    .manage(recoil_engine)
    .invoke_handler(tauri::generate_handler![
      save_secure_settings,
      load_secure_settings,
      recoil_start,
      recoil_stop,
      recoil_set_enabled,
      recoil_toggle_enabled,
      recoil_set_scope,
      recoil_update_settings,
      recoil_update_hotkeys,
      recoil_status
    ])
    .setup(|app| {
      let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
      let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

      TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            if let Some(window) = tray.app_handle().get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
        })
        .on_menu_event(|app, event| match event.id().as_ref() {
          "show" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.set_focus();
            }
          }
          "quit" => {
            app.exit(0);
          }
          _ => {}
        })
        .build(app)?;

      if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_theme(Some(tauri::Theme::Dark));
      }

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
      }
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
