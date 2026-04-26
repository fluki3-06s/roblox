use serde::Serialize;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Duration;
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, mouse_event, MOUSEEVENTF_MOVE};

const VK_LBUTTON: i32 = 0x01;
const VK_RBUTTON: i32 = 0x02;
const VK_XBUTTON1: i32 = 0x05;
const VK_XBUTTON2: i32 = 0x06;
const VK_F8: i32 = 0x77;

const GLOBAL_PULL_MULTIPLIER: f64 = 1.0;

#[derive(Clone, Copy)]
struct ScopeProfile {
    multiplier: f64,
    fine_tune: f64,
    mid_taper_start: usize,
    mid_taper_min: f64,
}

#[derive(Serialize, Clone)]
pub struct EngineStatus {
    pub running: bool,
    pub enabled: bool,
    pub scope: String,
    pub global_scale: f64,
    pub step_interval_ms: f64,
}

struct EngineState {
    enabled: bool,
    scope: String,
    global_scale: f64,
    step_interval_ms: f64,
    curve: Vec<f64>,
    step_idx: usize,
    prev_pull: f64,
    max_steps: usize,
    f8_pressed: bool,
    scope_hotkeys: [i32; 5],   // Red Dot, x2, x3, x4, x6
    hotkey_pressed: [bool; 5], // edge-trigger per scope hotkey
}

impl EngineState {
    fn new() -> Self {
        let curve = build_m4_curve_40();
        let max_steps = curve.len();
        Self {
            enabled: true,
            scope: "Red Dot".to_string(),
            global_scale: 1.0,
            step_interval_ms: 10.0,
            curve,
            step_idx: 1,
            prev_pull: 0.0,
            max_steps,
            f8_pressed: false,
            scope_hotkeys: [0x70, 0x71, 0x72, 0x73, 0x74], // F1..F5
            hotkey_pressed: [false; 5],
        }
    }

    fn reset_recoil(&mut self) {
        self.step_idx = 1;
        self.prev_pull = 0.0;
    }
}

pub struct RecoilEngine {
    state: Arc<Mutex<EngineState>>,
    alive: Arc<AtomicBool>,
    worker: Mutex<Option<JoinHandle<()>>>,
}

impl Default for RecoilEngine {
    fn default() -> Self {
        Self {
            state: Arc::new(Mutex::new(EngineState::new())),
            alive: Arc::new(AtomicBool::new(false)),
            worker: Mutex::new(None),
        }
    }
}

impl RecoilEngine {
    pub fn start(&self) -> Result<(), String> {
        if self.alive.load(Ordering::SeqCst) {
            return Ok(());
        }

        self.alive.store(true, Ordering::SeqCst);
        let state = Arc::clone(&self.state);
        let alive = Arc::clone(&self.alive);

        let handle = thread::Builder::new()
            .name("m4-recoil-engine".to_string())
            .spawn(move || run_loop(state, alive))
            .map_err(|error| format!("failed to start recoil thread: {error}"))?;

        let mut worker = self.worker.lock().map_err(|_| "worker mutex poisoned".to_string())?;
        *worker = Some(handle);
        Ok(())
    }

    pub fn stop(&self) -> Result<(), String> {
        self.alive.store(false, Ordering::SeqCst);
        let mut worker = self.worker.lock().map_err(|_| "worker mutex poisoned".to_string())?;
        if let Some(handle) = worker.take() {
            let _ = handle.join();
        }
        Ok(())
    }

    pub fn set_enabled(&self, enabled: bool) -> Result<(), String> {
        let mut state = self.state.lock().map_err(|_| "state mutex poisoned".to_string())?;
        state.enabled = enabled;
        if !enabled {
            state.reset_recoil();
        }
        Ok(())
    }

    pub fn toggle_enabled(&self) -> Result<bool, String> {
        let mut state = self.state.lock().map_err(|_| "state mutex poisoned".to_string())?;
        state.enabled = !state.enabled;
        if !state.enabled {
            state.reset_recoil();
        }
        Ok(state.enabled)
    }

    pub fn set_scope(&self, scope: &str) -> Result<(), String> {
        if !is_valid_scope(scope) {
            return Err("invalid scope".to_string());
        }
        let mut state = self.state.lock().map_err(|_| "state mutex poisoned".to_string())?;
        state.scope = scope.to_string();
        Ok(())
    }

    pub fn set_settings(&self, global_scale: f64, step_interval_ms: f64) -> Result<(), String> {
        let mut state = self.state.lock().map_err(|_| "state mutex poisoned".to_string())?;
        state.global_scale = clamp(global_scale, 0.0, 3.0);
        state.step_interval_ms = clamp(step_interval_ms, 6.0, 16.0);
        Ok(())
    }

    pub fn set_hotkeys(&self, hotkeys: HashMap<String, String>) -> Result<(), String> {
        let mut state = self.state.lock().map_err(|_| "state mutex poisoned".to_string())?;
        apply_hotkey_map(&mut state, hotkeys);
        Ok(())
    }

    pub fn status(&self) -> Result<EngineStatus, String> {
        let state = self.state.lock().map_err(|_| "state mutex poisoned".to_string())?;
        Ok(EngineStatus {
            running: self.alive.load(Ordering::SeqCst),
            enabled: state.enabled,
            scope: state.scope.clone(),
            global_scale: state.global_scale,
            step_interval_ms: state.step_interval_ms,
        })
    }
}

fn run_loop(state: Arc<Mutex<EngineState>>, alive: Arc<AtomicBool>) {
    while alive.load(Ordering::SeqCst) {
        let wait_ms = {
            let mut engine = match state.lock() {
                Ok(guard) => guard,
                Err(_) => break,
            };

            let ads = is_pressed(VK_RBUTTON);
            let fire = is_pressed(VK_LBUTTON);
            let f8_now = is_pressed(VK_F8);
            if f8_now && !engine.f8_pressed {
                engine.enabled = !engine.enabled;
                if !engine.enabled {
                    engine.reset_recoil();
                }
            }
            engine.f8_pressed = f8_now;
            apply_config_hotkeys(&mut engine, ads, fire);
            if !engine.enabled {
                engine.reset_recoil();
                8.0
            } else if ads && fire {
                let target = target_pull(&engine);
                let pull = smooth_pull(&mut engine, target);
                move_mouse_relative(0.0, pull);
                engine.step_idx = (engine.step_idx + 1).min(engine.max_steps);
                engine.step_interval_ms
            } else {
                engine.reset_recoil();
                1.0
            }
        };

        thread::sleep(Duration::from_secs_f64(wait_ms / 1000.0));
    }
}

fn apply_config_hotkeys(engine: &mut EngineState, ads: bool, fire: bool) {
    let lock_switch = ads || fire;
    let scopes = ["Red Dot", "x2", "x3", "x4", "x6"];
    for (idx, scope_name) in scopes.iter().enumerate() {
        let vk = engine.scope_hotkeys[idx];
        let pressed = is_pressed(vk);
        if !lock_switch && pressed && !engine.hotkey_pressed[idx] {
            engine.scope = (*scope_name).to_string();
        }
        engine.hotkey_pressed[idx] = pressed;
    }
}

fn apply_hotkey_map(state: &mut EngineState, hotkeys: HashMap<String, String>) {
    for (mode, hotkey) in hotkeys {
        let Some(vk) = parse_hotkey_to_vk(&hotkey) else {
            continue;
        };
        match mode.trim().to_uppercase().as_str() {
            "REDDOT" | "RED DOT" => state.scope_hotkeys[0] = vk,
            "SCOPE X2" | "X2" => state.scope_hotkeys[1] = vk,
            "SCOPE X3" | "X3" => state.scope_hotkeys[2] = vk,
            "SCOPE X4" | "X4" => state.scope_hotkeys[3] = vk,
            "SCOPE X6" | "X6" => state.scope_hotkeys[4] = vk,
            _ => {}
        }
    }
}

fn parse_hotkey_to_vk(token: &str) -> Option<i32> {
    let normalized = token.trim().to_uppercase();
    if let Some(rest) = normalized.strip_prefix("KEY") {
        if rest.len() == 1 {
            let ch = rest.chars().next()?;
            if ch.is_ascii_alphabetic() {
                return Some(ch as i32);
            }
        }
    }
    if let Some(rest) = normalized.strip_prefix("DIGIT") {
        if rest.len() == 1 {
            let ch = rest.chars().next()?;
            if ch.is_ascii_digit() {
                return Some(ch as i32);
            }
        }
    }
    if let Some(rest) = normalized.strip_prefix("NUMPAD") {
        if let Ok(number) = rest.parse::<i32>() {
            if (0..=9).contains(&number) {
                return Some(0x60 + number); // Num0..Num9
            }
        }
    }
    if let Some(rest) = normalized.strip_prefix('F') {
        if let Ok(number) = rest.parse::<i32>() {
            if (1..=24).contains(&number) {
                return Some(0x6F + number); // F1..F24
            }
        }
    }
    if normalized.len() == 1 {
        let ch = normalized.chars().next()?;
        if ch.is_ascii_alphanumeric() {
            return Some(ch as i32);
        }
    }
    match normalized.as_str() {
        "ARROWUP" => Some(0x26),
        "ARROWDOWN" => Some(0x28),
        "ARROWLEFT" => Some(0x25),
        "ARROWRIGHT" => Some(0x27),
        "SHIFT" => Some(0x10),
        "CTRL" | "CONTROL" => Some(0x11),
        "ALT" => Some(0x12),
        "META" | "WIN" | "WINDOWS" => Some(0x5B),
        "BACKSPACE" => Some(0x08),
        "CAPSLOCK" => Some(0x14),
        "PRINTSCREEN" => Some(0x2C),
        "SCROLLLOCK" => Some(0x91),
        "PAUSE" => Some(0x13),
        "NUM0" => Some(0x60),
        "NUM1" => Some(0x61),
        "NUM2" => Some(0x62),
        "NUM3" => Some(0x63),
        "NUM4" => Some(0x64),
        "NUM5" => Some(0x65),
        "NUM6" => Some(0x66),
        "NUM7" => Some(0x67),
        "NUM8" => Some(0x68),
        "NUM9" => Some(0x69),
        "NUM+" => Some(0x6B),
        "NUM-" => Some(0x6D),
        "NUM*" => Some(0x6A),
        "NUM/" => Some(0x6F),
        "NUM." => Some(0x6E),
        "NUMENTER" => Some(0x0D),
        "MOUSE4" => Some(VK_XBUTTON1),
        "MOUSE5" => Some(VK_XBUTTON2),
        "SPACE" => Some(0x20),
        "TAB" => Some(0x09),
        "ENTER" => Some(0x0D),
        "ESCAPE" => Some(0x1B),
        _ => None,
    }
}

fn target_pull(engine: &EngineState) -> f64 {
    let step = clamp(engine.step_idx as f64, 1.0, engine.max_steps as f64) as usize - 1;
    let base = engine.curve[step];
    let profile = profile_for_scope(&engine.scope);

    let taper = if engine.step_idx < profile.mid_taper_start {
        1.0
    } else {
        let span = (engine.max_steps - profile.mid_taper_start).max(1);
        let t = (engine.step_idx - profile.mid_taper_start) as f64 / span as f64;
        1.0 + ((profile.mid_taper_min - 1.0) * clamp(t, 0.0, 1.0))
    };

    let mut pull =
        base * profile.multiplier * profile.fine_tune * taper * GLOBAL_PULL_MULTIPLIER * engine.global_scale * env_scale();

    if engine.step_idx == 1 {
        pull *= 1.22;
    } else if engine.step_idx == 2 {
        pull *= 1.10;
    }

    if engine.scope == "x6" {
        if engine.step_idx == 1 {
            pull *= 1.14;
        } else if engine.step_idx <= 4 {
            pull *= 1.07;
        }
    }

    pull
}

fn smooth_pull(engine: &mut EngineState, target: f64) -> f64 {
    let alpha = if engine.step_idx <= 2 { 0.70 } else { 0.35 };
    engine.prev_pull = (engine.prev_pull * (1.0 - alpha)) + (target * alpha);
    engine.prev_pull
}

fn env_scale() -> f64 {
    1.0
}

fn is_pressed(vk_code: i32) -> bool {
    unsafe { (GetAsyncKeyState(vk_code) as u16 & 0x8000) != 0 }
}

fn move_mouse_relative(dx: f64, dy: f64) {
    unsafe {
        mouse_event(MOUSEEVENTF_MOVE, dx.round() as i32, dy.round() as i32, 0, 0);
    }
}

fn profile_for_scope(scope: &str) -> ScopeProfile {
    match scope {
        "x2" => ScopeProfile {
            multiplier: 0.60,
            fine_tune: 1.0,
            mid_taper_start: 19,
            mid_taper_min: 1.18,
        },
        "x3" => ScopeProfile {
            multiplier: 1.00,
            fine_tune: 1.0,
            mid_taper_start: 18,
            mid_taper_min: 1.03,
        },
        "x4" => ScopeProfile {
            multiplier: 1.46,
            fine_tune: 1.0,
            mid_taper_start: 18,
            mid_taper_min: 1.03,
        },
        "x6" => ScopeProfile {
            multiplier: 1.95,
            fine_tune: 1.0,
            mid_taper_start: 22,
            mid_taper_min: 1.10,
        },
        _ => ScopeProfile {
            multiplier: 0.385,
            fine_tune: 1.0,
            mid_taper_start: 20,
            mid_taper_min: 0.98,
        },
    }
}

fn build_m4_curve_40() -> Vec<f64> {
    let mut curve = Vec::new();
    curve.extend(std::iter::repeat_n(4.8, 6));
    curve.extend(std::iter::repeat_n(5.6, 6));
    curve.extend(std::iter::repeat_n(6.4, 8));
    curve.extend(std::iter::repeat_n(7.2, 8));
    curve.extend(std::iter::repeat_n(8.0, 6));
    curve.extend(std::iter::repeat_n(8.8, 4));
    curve.extend(std::iter::repeat_n(9.4, 2));
    curve
}

fn is_valid_scope(scope: &str) -> bool {
    matches!(scope, "Red Dot" | "x2" | "x3" | "x4" | "x6")
}

fn clamp(value: f64, min_val: f64, max_val: f64) -> f64 {
    value.max(min_val).min(max_val)
}
