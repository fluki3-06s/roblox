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
use std::str::FromStr;
use std::sync::Mutex;
use tauri::Manager;
use tauri::{
  image::Image,
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const SECURE_SETTINGS_FILE: &str = "system-settings.secure";
const TRIAL_ICON_1: &[u8] = include_bytes!("../icons/trial-icon-1.png");
const EMERGENCY_RESTORE_SHORTCUT: &str = "Ctrl+Shift+F10";

fn load_trial_icon() -> Result<Image<'static>, String> {
  let decoded = image::load_from_memory(TRIAL_ICON_1)
    .map_err(|error| format!("failed to decode trial icon png: {error}"))?;
  let rgba = decoded.to_rgba8();
  let (width, height) = rgba.dimensions();
  Ok(Image::new_owned(rgba.into_raw(), width, height))
}

#[derive(Default)]
struct GlobalHotkeyBindings {
  shortcuts_to_scope: Mutex<HashMap<String, String>>,
  registered_scope_shortcuts: Mutex<Vec<Shortcut>>,
}

#[derive(Default)]
struct AppUiState {
  tray_icon: Mutex<Option<TrayIcon>>,
}

fn mode_to_scope(mode: &str) -> Option<&'static str> {
  match mode.trim().to_uppercase().as_str() {
    "REDDOT" | "RED DOT" | "SCOPE CLOSE" => Some("Red Dot"),
    "SCOPE X2" | "X2" | "SCOPE SHORT" => Some("x2"),
    "SCOPE X3" | "X3" | "SCOPE MID" => Some("x3"),
    "SCOPE X4" | "X4" | "SCOPE LONG" => Some("x4"),
    "SCOPE X6" | "X6" | "SCOPE EXTREME" => Some("x6"),
    _ => None,
  }
}

fn hotkey_token_to_shortcut(token: &str) -> Option<Shortcut> {
  let normalized = token.trim().to_uppercase();
  let candidates: Vec<String> = if let Some(rest) = normalized.strip_prefix("KEY") {
    if rest.len() == 1 && rest.chars().all(|ch| ch.is_ascii_alphabetic()) {
      vec![rest.to_string()]
    } else {
      return None;
    }
  } else if let Some(rest) = normalized.strip_prefix("DIGIT") {
    if rest.len() == 1 && rest.chars().all(|ch| ch.is_ascii_digit()) {
      vec![rest.to_string()]
    } else {
      return None;
    }
  } else {
    match normalized.as_str() {
      "-" => vec!["Minus".to_string()],
      "=" => vec!["Equal".to_string()],
      "[" => vec!["BracketLeft".to_string()],
      "]" => vec!["BracketRight".to_string()],
      ";" => vec!["Semicolon".to_string()],
      "'" => vec!["Quote".to_string()],
      "," => vec!["Comma".to_string()],
      "." => vec!["Period".to_string()],
      "/" => vec!["Slash".to_string()],
      "\\" => vec!["Backslash".to_string()],
      "`" => vec!["Backquote".to_string()],
      "ARROWUP" => vec!["ArrowUp".to_string(), "Up".to_string()],
      "ARROWDOWN" => vec!["ArrowDown".to_string(), "Down".to_string()],
      "ARROWLEFT" => vec!["ArrowLeft".to_string(), "Left".to_string()],
      "ARROWRIGHT" => vec!["ArrowRight".to_string(), "Right".to_string()],
      "SPACE" => vec!["Space".to_string()],
      "TAB" => vec!["Tab".to_string()],
      "ENTER" | "NUMENTER" => vec!["Enter".to_string()],
      "ESCAPE" => vec!["Escape".to_string()],
      "BACKSPACE" => vec!["Backspace".to_string()],
      "DELETE" => vec!["Delete".to_string()],
      "INSERT" => vec!["Insert".to_string()],
      "HOME" => vec!["Home".to_string()],
      "END" => vec!["End".to_string()],
      "PAGEUP" => vec!["PageUp".to_string()],
      "PAGEDOWN" => vec!["PageDown".to_string()],
      _ => vec![normalized],
    }
  };

  candidates
    .into_iter()
    .find_map(|candidate| Shortcut::from_str(&candidate).ok())
}

fn register_global_hotkeys(
  app: &tauri::AppHandle,
  hotkeys: &HashMap<String, String>,
) -> Result<(), String> {
  let state = app.state::<GlobalHotkeyBindings>();
  {
    let mut previous = state
      .registered_scope_shortcuts
      .lock()
      .map_err(|_| "global shortcut registry mutex poisoned".to_string())?;
    for shortcut in previous.iter() {
      let _ = app.global_shortcut().unregister(shortcut.clone());
    }
    previous.clear();
  }

  let mut shortcuts_to_scope = HashMap::new();
  let mut registered_scope_shortcuts = Vec::new();
  for (mode, token) in hotkeys {
    let Some(scope) = mode_to_scope(mode) else {
      continue;
    };
    let Some(shortcut) = hotkey_token_to_shortcut(token) else {
      continue;
    };

    if let Err(error) = app.global_shortcut().register(shortcut.clone()) {
      log::warn!("failed to register global shortcut {token}: {error}");
      continue;
    }
    registered_scope_shortcuts.push(shortcut.clone());
    shortcuts_to_scope.insert(shortcut.to_string().to_uppercase(), scope.to_string());
  }

  let mut guard = state
    .shortcuts_to_scope
    .lock()
    .map_err(|_| "global shortcut state mutex poisoned".to_string())?;
  *guard = shortcuts_to_scope;
  let mut previous = state
    .registered_scope_shortcuts
    .lock()
    .map_err(|_| "global shortcut registry mutex poisoned".to_string())?;
  *previous = registered_scope_shortcuts;
  Ok(())
}

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
  app: tauri::AppHandle,
  engine: tauri::State<'_, RecoilEngine>,
  hotkeys: HashMap<String, String>,
) -> Result<(), String> {
  engine.set_hotkeys(hotkeys.clone())?;
  register_global_hotkeys(&app, &hotkeys)
}

#[tauri::command]
fn recoil_status(engine: tauri::State<'_, RecoilEngine>) -> Result<EngineStatus, String> {
  engine.status()
}

#[tauri::command]
fn set_streamer_mode(app: tauri::AppHandle, enabled: bool) -> Result<(), String> {
  let Some(window) = app.get_webview_window("main") else {
    return Err("main window not found".to_string());
  };
  window
    .set_content_protected(enabled)
    .map_err(|error| format!("failed to update streamer mode: {error}"))?;
  window
    .set_skip_taskbar(enabled)
    .map_err(|error| format!("failed to update taskbar visibility: {error}"))?;

  let ui_state = app.state::<AppUiState>();
  if let Ok(guard) = ui_state.tray_icon.lock() {
    if let Some(tray_icon) = guard.as_ref() {
      let _ = tray_icon.set_visible(!enabled);
    }
  }
  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let recoil_engine = RecoilEngine::default();
  tauri::Builder::default()
    .plugin(
      tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, shortcut, event| {
          if event.state != ShortcutState::Pressed {
            return;
          }
          log::info!("global shortcut pressed: {}", shortcut);
          if shortcut.to_string().eq_ignore_ascii_case(EMERGENCY_RESTORE_SHORTCUT) {
            let ui_state = app.state::<AppUiState>();
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.set_skip_taskbar(false);
              let _ = window.show();
              let _ = window.set_focus();
            }
            if let Ok(guard) = ui_state.tray_icon.lock() {
              if let Some(tray_icon) = guard.as_ref() {
                let _ = tray_icon.set_visible(true);
              }
            }
            return;
          }
          let state = app.state::<GlobalHotkeyBindings>();
          let scope = {
            let Ok(guard) = state.shortcuts_to_scope.lock() else {
              return;
            };
            guard.get(&shortcut.to_string().to_uppercase()).cloned()
          };
          let Some(scope) = scope else {
            log::info!("global shortcut has no mapped scope: {}", shortcut);
            return;
          };
          let engine = app.state::<RecoilEngine>();
          if engine.set_scope(&scope).is_ok() {
            log::info!("global shortcut switched scope -> {}", scope);
          }
        })
        .build(),
    )
    .manage(GlobalHotkeyBindings::default())
    .manage(AppUiState::default())
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
      recoil_status,
      set_streamer_mode
    ])
    .setup(|app| {
      {
        let engine = app.state::<RecoilEngine>();
        if let Err(error) = engine.start() {
          log::warn!("failed to auto-start recoil engine: {error}");
        }
      }

      let trial_icon = load_trial_icon()?;
      let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
      let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

      let tray_icon = TrayIconBuilder::new()
        .icon(trial_icon.clone())
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
      if let Ok(mut guard) = app.state::<AppUiState>().tray_icon.lock() {
        *guard = Some(tray_icon);
      }

      if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_icon(trial_icon.clone());
        let _ = window.set_theme(Some(tauri::Theme::Dark));
      }
      let default_hotkeys = HashMap::from([
        ("Reddot".to_string(), "F1".to_string()),
        ("SCOPE X2".to_string(), "F2".to_string()),
        ("SCOPE X3".to_string(), "F3".to_string()),
        ("SCOPE X4".to_string(), "F4".to_string()),
        ("SCOPE X6".to_string(), "F5".to_string()),
      ]);
      register_global_hotkeys(app.handle(), &default_hotkeys)?;
      if let Ok(shortcut) = Shortcut::from_str(EMERGENCY_RESTORE_SHORTCUT) {
        let _ = app.global_shortcut().register(shortcut);
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
