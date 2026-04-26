use serde::Serialize;
use std::collections::HashMap;
use std::fs::OpenOptions;
use std::io::Write;
use std::ptr::null_mut;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::OnceLock;
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetAsyncKeyState, mouse_event, MOUSEEVENTF_MOVE};
use windows_sys::Win32::UI::WindowsAndMessaging::{
    CallNextHookEx, DispatchMessageW, GetMessageW, PostThreadMessageW, SetWindowsHookExW, TranslateMessage,
    UnhookWindowsHookEx, HC_ACTION, HHOOK, KBDLLHOOKSTRUCT, MSG, WH_KEYBOARD_LL, WM_KEYDOWN, WM_KEYUP, WM_QUIT,
    WM_SYSKEYDOWN, WM_SYSKEYUP,
};

const VK_LBUTTON: i32 = 0x01;
const VK_RBUTTON: i32 = 0x02;
const VK_XBUTTON1: i32 = 0x05;
const VK_XBUTTON2: i32 = 0x06;
const VK_BROWSER_BACK: i32 = 0xA6;
const VK_BROWSER_FORWARD: i32 = 0xA7;
const VK_F8: i32 = 0x77;

const GLOBAL_PULL_MULTIPLIER: f64 = 1.0;
const HOTKEY_REPEAT_COOLDOWN_MS: u128 = 140;

static HOOK_ENGINE_STATE: OnceLock<Arc<Mutex<EngineState>>> = OnceLock::new();
static HOOK_ACTIVE: AtomicBool = AtomicBool::new(false);
static ACTIVE_HOTKEY_SOURCE: AtomicUsize = AtomicUsize::new(0);
const HOTKEY_SOURCE_HOOK: usize = 1;
const HOTKEY_SOURCE_POLLING: usize = 2;

fn append_hook_trace(message: &str) {
    let path = std::env::temp_dir().join("roblox-hotkey-hook.log");
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "{}", message);
    }
}

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
    scope_hotkeys: [Vec<i32>; 5], // Red Dot, x2, x3, x4, x6 (multiple VK aliases per hotkey)
    hotkey_pressed: [bool; 5], // edge-trigger per scope hotkey
    hotkey_last_trigger_ms: [u128; 5],
    hook_hotkey_pressed: [bool; 5],
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
            scope_hotkeys: [
                vec![0x70], // F1
                vec![0x71], // F2
                vec![0x72], // F3
                vec![0x73], // F4
                vec![0x74], // F5
            ],
            hotkey_pressed: [false; 5],
            hotkey_last_trigger_ms: [0; 5],
            hook_hotkey_pressed: [false; 5],
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
    hook_worker: Mutex<Option<JoinHandle<()>>>,
    hook_thread_id: Arc<std::sync::atomic::AtomicU32>,
}

impl Default for RecoilEngine {
    fn default() -> Self {
        Self {
            state: Arc::new(Mutex::new(EngineState::new())),
            alive: Arc::new(AtomicBool::new(false)),
            worker: Mutex::new(None),
            hook_worker: Mutex::new(None),
            hook_thread_id: Arc::new(std::sync::atomic::AtomicU32::new(0)),
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
        let hook_state = Arc::clone(&self.state);
        let hook_alive = Arc::clone(&self.alive);
        let hook_thread_id = Arc::clone(&self.hook_thread_id);

        let handle = thread::Builder::new()
            .name("m4-recoil-engine".to_string())
            .spawn(move || run_loop(state, alive))
            .map_err(|error| format!("failed to start recoil thread: {error}"))?;
        let hook_handle = thread::Builder::new()
            .name("m4-hotkey-hook".to_string())
            .spawn(move || run_global_hook_loop(hook_state, hook_alive, hook_thread_id))
            .map_err(|error| format!("failed to start global hook thread: {error}"))?;

        let mut worker = self.worker.lock().map_err(|_| "worker mutex poisoned".to_string())?;
        *worker = Some(handle);
        let mut hook_worker = self
            .hook_worker
            .lock()
            .map_err(|_| "hook worker mutex poisoned".to_string())?;
        *hook_worker = Some(hook_handle);
        Ok(())
    }

    pub fn stop(&self) -> Result<(), String> {
        self.alive.store(false, Ordering::SeqCst);
        let mut worker = self.worker.lock().map_err(|_| "worker mutex poisoned".to_string())?;
        if let Some(handle) = worker.take() {
            let _ = handle.join();
        }

        let thread_id = self.hook_thread_id.load(Ordering::SeqCst);
        if thread_id != 0 {
            unsafe {
                let _ = PostThreadMessageW(thread_id, WM_QUIT, 0, 0);
            }
        }
        let mut hook_worker = self
            .hook_worker
            .lock()
            .map_err(|_| "hook worker mutex poisoned".to_string())?;
        if let Some(handle) = hook_worker.take() {
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
        append_hook_trace(&format!(
            "set_hotkeys applied enabled={} bindings={}",
            state.enabled,
            format_bindings(&state.scope_hotkeys)
        ));
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
            reconcile_hotkey_release_state(&mut engine);
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

fn apply_config_hotkeys(engine: &mut EngineState, _ads: bool, _fire: bool) {
    let scopes = ["Red Dot", "x2", "x3", "x4", "x6"];
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);

    for (idx, scope_name) in scopes.iter().enumerate() {
        let binding = engine.scope_hotkeys[idx].clone();
        let pressed = is_any_pressed(&binding);
        if pressed {
            let is_new_press = !engine.hotkey_pressed[idx];
            if is_new_press {
                engine.scope = (*scope_name).to_string();
                engine.hotkey_last_trigger_ms[idx] = now_ms;
                engine.reset_recoil();
                ACTIVE_HOTKEY_SOURCE.store(HOTKEY_SOURCE_POLLING, Ordering::SeqCst);
                log::info!("polling hotkey switched scope -> {} (binding={:?})", scope_name, binding);
            }
        }
        engine.hotkey_pressed[idx] = pressed;
    }
}

fn apply_hotkey_map(state: &mut EngineState, hotkeys: HashMap<String, String>) {
    for (mode, hotkey) in hotkeys {
        let Some(vks) = parse_hotkey_to_vks(&hotkey) else {
            continue;
        };
        match mode.trim().to_uppercase().as_str() {
            "REDDOT" | "RED DOT" | "SCOPE CLOSE" => state.scope_hotkeys[0] = vks,
            "SCOPE X2" | "X2" | "SCOPE SHORT" => state.scope_hotkeys[1] = vks,
            "SCOPE X3" | "X3" | "SCOPE MID" => state.scope_hotkeys[2] = vks,
            "SCOPE X4" | "X4" | "SCOPE LONG" => state.scope_hotkeys[3] = vks,
            "SCOPE X6" | "X6" | "SCOPE EXTREME" => state.scope_hotkeys[4] = vks,
            _ => {}
        }
    }
}

fn parse_hotkey_to_vks(token: &str) -> Option<Vec<i32>> {
    let normalized = token.trim().to_uppercase();
    if let Some(rest) = normalized.strip_prefix("KEY") {
        if rest.len() == 1 {
            let ch = rest.chars().next()?;
            if ch.is_ascii_alphabetic() {
                return Some(vec![ch as i32]);
            }
        }
    }
    if let Some(rest) = normalized.strip_prefix("DIGIT") {
        if rest.len() == 1 {
            let ch = rest.chars().next()?;
            if ch.is_ascii_digit() {
                return Some(vec![ch as i32]);
            }
        }
    }
    if let Some(rest) = normalized.strip_prefix("NUMPAD") {
        if let Ok(number) = rest.parse::<i32>() {
            if (0..=9).contains(&number) {
                return Some(vec![0x60 + number]); // Num0..Num9
            }
        }
    }
    if let Some(rest) = normalized.strip_prefix('F') {
        if let Ok(number) = rest.parse::<i32>() {
            if (1..=24).contains(&number) {
                return Some(vec![0x6F + number]); // F1..F24
            }
        }
    }
    if normalized.len() == 1 {
        let ch = normalized.chars().next()?;
        if ch.is_ascii_alphanumeric() {
            return Some(vec![ch as i32]);
        }
    }
    match normalized.as_str() {
        "-" => Some(vec![0xBD]),
        "=" => Some(vec![0xBB]),
        "[" => Some(vec![0xDB]),
        "]" => Some(vec![0xDD]),
        ";" => Some(vec![0xBA]),
        "'" => Some(vec![0xDE]),
        "," => Some(vec![0xBC]),
        "." => Some(vec![0xBE]),
        "/" => Some(vec![0xBF]),
        "\\" => Some(vec![0xDC]),
        "`" => Some(vec![0xC0]),
        "ARROWUP" => Some(vec![0x26]),
        "ARROWDOWN" => Some(vec![0x28]),
        "ARROWLEFT" => Some(vec![0x25]),
        "ARROWRIGHT" => Some(vec![0x27]),
        "UP" => Some(vec![0x26]),
        "DOWN" => Some(vec![0x28]),
        "LEFT" => Some(vec![0x25]),
        "RIGHT" => Some(vec![0x27]),
        "SHIFT" => Some(vec![0x10, 0xA0, 0xA1]),
        "LSHIFT" => Some(vec![0xA0]),
        "RSHIFT" => Some(vec![0xA1]),
        "CTRL" | "CONTROL" => Some(vec![0x11, 0xA2, 0xA3]),
        "LCTRL" | "LCONTROL" => Some(vec![0xA2]),
        "RCTRL" | "RCONTROL" => Some(vec![0xA3]),
        "ALT" => Some(vec![0x12, 0xA4, 0xA5]),
        "LALT" => Some(vec![0xA4]),
        "RALT" => Some(vec![0xA5]),
        "META" | "WIN" | "WINDOWS" => Some(vec![0x5B]),
        "BACKSPACE" => Some(vec![0x08]),
        "CAPSLOCK" => Some(vec![0x14]),
        "PRINTSCREEN" => Some(vec![0x2C]),
        "SCROLLLOCK" => Some(vec![0x91]),
        "PAUSE" => Some(vec![0x13]),
        "NUM0" => Some(vec![0x60]),
        "NUM1" => Some(vec![0x61]),
        "NUM2" => Some(vec![0x62]),
        "NUM3" => Some(vec![0x63]),
        "NUM4" => Some(vec![0x64]),
        "NUM5" => Some(vec![0x65]),
        "NUM6" => Some(vec![0x66]),
        "NUM7" => Some(vec![0x67]),
        "NUM8" => Some(vec![0x68]),
        "NUM9" => Some(vec![0x69]),
        "NUM+" => Some(vec![0x6B]),
        "NUM-" => Some(vec![0x6D]),
        "NUM*" => Some(vec![0x6A]),
        "NUM/" => Some(vec![0x6F]),
        "NUM." => Some(vec![0x6E]),
        "NUMENTER" => Some(vec![0x0D]),
        "DECIMAL" => Some(vec![0x6E]),
        "ADD" => Some(vec![0x6B]),
        "SUBTRACT" => Some(vec![0x6D]),
        "MULTIPLY" => Some(vec![0x6A]),
        "DIVIDE" => Some(vec![0x6F]),
        // Many mouse drivers emit BrowserBack/BrowserForward instead of XBUTTON vk.
        "MOUSE4" => Some(vec![VK_XBUTTON1, VK_BROWSER_BACK]),
        "MOUSE5" => Some(vec![VK_XBUTTON2, VK_BROWSER_FORWARD]),
        "SPACE" => Some(vec![0x20]),
        "TAB" => Some(vec![0x09]),
        "ENTER" => Some(vec![0x0D]),
        "ESCAPE" => Some(vec![0x1B]),
        "LEFTBRACKET" | "BRACKETLEFT" => Some(vec![0xDB]),
        "RIGHTBRACKET" | "BRACKETRIGHT" => Some(vec![0xDD]),
        "SEMICOLON" => Some(vec![0xBA]),
        "QUOTE" => Some(vec![0xDE]),
        "COMMA" => Some(vec![0xBC]),
        "PERIOD" => Some(vec![0xBE]),
        "SLASH" => Some(vec![0xBF]),
        "BACKQUOTE" | "GRAVE" => Some(vec![0xC0]),
        "BACKSLASH" => Some(vec![0xDC]),
        "MINUS" => Some(vec![0xBD]),
        "EQUAL" => Some(vec![0xBB]),
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

fn is_any_pressed(vks: &[i32]) -> bool {
    vks.iter().any(|vk| is_pressed(*vk))
}

fn reconcile_hotkey_release_state(engine: &mut EngineState) {
    for idx in 0..engine.scope_hotkeys.len() {
        let pressed_now = is_any_pressed(&engine.scope_hotkeys[idx]);
        if !pressed_now {
            engine.hook_hotkey_pressed[idx] = false;
            engine.hotkey_pressed[idx] = false;
        }
    }
}

fn run_global_hook_loop(
    state: Arc<Mutex<EngineState>>,
    alive: Arc<AtomicBool>,
    hook_thread_id: Arc<std::sync::atomic::AtomicU32>,
) {
    let _ = HOOK_ENGINE_STATE.get_or_init(|| Arc::clone(&state));
    let thread_id = unsafe { windows_sys::Win32::System::Threading::GetCurrentThreadId() };
    hook_thread_id.store(thread_id, Ordering::SeqCst);
    append_hook_trace(&format!("hook thread started tid={thread_id}"));

    unsafe {
        let keyboard_hook = SetWindowsHookExW(WH_KEYBOARD_LL, Some(low_level_keyboard_proc), null_mut(), 0);
        if keyboard_hook.is_null() {
            append_hook_trace("failed to install keyboard low-level hook");
            if !keyboard_hook.is_null() {
                let _ = UnhookWindowsHookEx(keyboard_hook);
            }
            hook_thread_id.store(0, Ordering::SeqCst);
            return;
        }
        HOOK_ACTIVE.store(true, Ordering::SeqCst);
        append_hook_trace("keyboard low-level hook installed");

        let mut msg: MSG = std::mem::zeroed();
        while alive.load(Ordering::SeqCst) && GetMessageW(&mut msg, null_mut(), 0, 0) > 0 {
            TranslateMessage(&msg);
            DispatchMessageW(&msg);
        }

        let _ = UnhookWindowsHookEx(keyboard_hook);
    }

    HOOK_ACTIVE.store(false, Ordering::SeqCst);
    append_hook_trace("hook thread exited");
    hook_thread_id.store(0, Ordering::SeqCst);
}

unsafe extern "system" fn low_level_keyboard_proc(code: i32, wparam: usize, lparam: isize) -> isize {
    if (code as u32) == HC_ACTION && (wparam as u32 == WM_KEYDOWN || wparam as u32 == WM_SYSKEYDOWN) {
        let data = &*(lparam as *const KBDLLHOOKSTRUCT);
        append_hook_trace(&format!("keyboard event vk={}", data.vkCode));
        handle_global_hotkey_vk(data.vkCode as i32, true);
    } else if (code as u32) == HC_ACTION && (wparam as u32 == WM_KEYUP || wparam as u32 == WM_SYSKEYUP) {
        let data = &*(lparam as *const KBDLLHOOKSTRUCT);
        handle_global_hotkey_vk(data.vkCode as i32, false);
    }
    CallNextHookEx(null_mut() as HHOOK, code, wparam, lparam)
}

fn handle_global_hotkey_vk(vk: i32, pressed: bool) {
    let Some(state) = HOOK_ENGINE_STATE.get() else {
        return;
    };
    let now_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or(0);
    let scopes = ["Red Dot", "x2", "x3", "x4", "x6"];
    let mut engine = match state.lock() {
        Ok(guard) => guard,
        Err(_) => return,
    };
    if !engine.enabled {
        append_hook_trace(&format!("hook vk={} ignored because engine disabled", vk));
        return;
    }
    let mut matched = false;
    for (idx, scope_name) in scopes.iter().enumerate() {
        if engine.scope_hotkeys[idx].iter().any(|bound_vk| *bound_vk == vk) {
            matched = true;
            if pressed {
                if engine.hook_hotkey_pressed[idx] {
                    break;
                }
                if now_ms.saturating_sub(engine.hotkey_last_trigger_ms[idx]) < HOTKEY_REPEAT_COOLDOWN_MS {
                    break;
                }
                engine.scope = (*scope_name).to_string();
                engine.hotkey_last_trigger_ms[idx] = now_ms;
                engine.hook_hotkey_pressed[idx] = true;
                engine.reset_recoil();
                ACTIVE_HOTKEY_SOURCE.store(HOTKEY_SOURCE_HOOK, Ordering::SeqCst);
                log::info!("hook hotkey switched scope -> {} (vk={})", scope_name, vk);
                append_hook_trace(&format!("hook switched scope={} via vk={}", scope_name, vk));
            } else {
                engine.hook_hotkey_pressed[idx] = false;
            }
            break;
        }
    }
    if !matched {
        append_hook_trace(&format!(
            "hook vk={} had no active match; bindings={}",
            vk,
            format_bindings(&engine.scope_hotkeys)
        ));
    } else if !pressed {
        append_hook_trace(&format!("hook released vk={}", vk));
    }
}

fn format_bindings(bindings: &[Vec<i32>; 5]) -> String {
    bindings
        .iter()
        .map(|binding| {
            let parts: Vec<String> = binding.iter().map(|vk| vk.to_string()).collect();
            format!("[{}]", parts.join(","))
        })
        .collect::<Vec<String>>()
        .join(" ")
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
