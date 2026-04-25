# Flow Diagram: Lua Armor Whitelist + Monetag Ads + Backend Generator + Roblox UI

## ภาพรวมระบบ

ระบบที่ใช้:
- **Monetag** – แสดงโฆษณา on เว็บ | ผู้ใช้กด "Get Key" 10 ครั้ง → ได้ key 24 ชม.
- **Backend ของคุณ** – Generator ทำหน้าที่สร้าง key ผ่าน Luarmor API
- **Luarmor** – Whitelist/Key validation สำหรับ script ใน Roblox
- **Roblox UI** – กรอก key จากเว็บ → ถ้า key หมดอายุ → kick ออกจากเกม

---

## Flow Diagram (Mermaid)

```mermaid
flowchart TB
    subgraph Web["🌐 เว็บไซต์ (Frontend)"]
        A[ผู้ใช้เปิดเว็บ Get Key]
        B[แสดงปุ่ม 'Get Key' + Monetag Ad]
        C[ผู้ใช้กด Get Key]
        D{นับจำนวนครั้ง}
        E[แสดง Key บนหน้าจอ]
        F[คัดลอก Key]
    end

    subgraph Monetag["📢 Monetag Ad Network"]
        M1[แสดงโฆษณา]
        M2[Postback → Backend เมื่อมี Click/Impression]
    end

    subgraph Backend["🖥️ Backend (Generator หลังบ้าน)"]
        B1[รับ Postback จาก Monetag]
        B2[นับ Click สำหรับ session/ymid]
        B3{ครบ 10 ครั้ง?}
        B4[เรียก Luarmor API: POST Add User]
        B5[ตั้ง auth_expire = now + 24 ชม.]
        B6[เก็บ Key ใน DB/Redis]
        B7[API: ส่ง Key ให้ Frontend]
    end

    subgraph Luarmor["🔐 Lua Armor"]
        L1[สร้าง Key ใหม่]
        L2[บันทึก Key + auth_expire 24h]
    end

    subgraph Roblox["🎮 Roblox Game"]
        R1[หน้าจอ UI กรอก Key]
        R2[ผู้ใช้ใส่ Key]
        R3[ตรวจสอบ Key - External Check API]
        R4{Key Valid?}
        R5[อนุญาตเล่นต่อ]
        R6[Kick ผู้เล่นออกจากเกม]
    end

    A --> B
    B --> C
    C --> M1
    M1 --> M2
    M2 --> B1
    B1 --> B2
    B2 --> B3
    B3 -->|ไม่ครบ| B
    B3 -->|ครบ 10 ครั้ง| B4
    B4 --> L1
    L1 --> L2
    L2 --> B5
    B5 --> B6
    B6 --> B7
    B7 --> E
    E --> F

    F -.->|คัดลอก Key| R1
    R1 --> R2
    R2 --> R3
    R3 --> R4
    R4 -->|KEY_VALID| R5
    R4 -->|หมดอายุ/Invalid| R6
```

---

## Sequence Diagram (รายละเอียดขั้นตอน)

```mermaid
sequenceDiagram
    participant U as ผู้ใช้
    participant W as เว็บไซต์
    participant M as Monetag
    participant B as Backend
    participant L as Luarmor
    participant R as Roblox

    Note over U,R: Phase 1 - ขอ Key จากเว็บ
    U->>W: เปิดหน้า Get Key
    W->>U: แสดงปุ่ม Get Key
    loop 10 ครั้ง
        U->>W: กด Get Key
        W->>M: แสดงโฆษณา (ymid=session_id)
        M->>U: แสดงโฆษณา
        U->>M: ดู/คลิกโฆษณา
        M->>B: Postback (event=click, ymid)
        B->>B: นับ +1 สำหรับ session
    end
    B->>B: ครบ 10 → สร้าง Key
    B->>L: POST Add User (auth_expire=now+24h)
    L->>B: คืน Key ใหม่
    B->>W: ส่ง Key
    W->>U: แสดง Key บนหน้าจอ

    Note over U,R: Phase 2 - ใช้ Key ใน Roblox
    U->>R: เปิดเกม + กรอก Key ใน UI
    R->>B: ตรวจสอบ Key (หรือเรียก Luarmor External API)
    B->>L: GET external_check_key
    L->>B: KEY_VALID / KEY_EXPIRED / ...
    B->>R: ผลการตรวจสอบ
    alt Key ยังใช้ได้
        R->>U: ให้เล่นต่อ
    else Key หมดอายุ/Invalid
        R->>U: Kick ออกจากเกม
    end
```

---

## สถาปัตยกรรมของระบบ

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         YOUR INFRASTRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐ │
│  │   WEBSITE    │     │   BACKEND    │     │   DATABASE / REDIS        │ │
│  │   (Frontend) │     │   (Node/PHP/ │     │   - session_id → count    │ │
│  │              │     │    Python)   │     │   - session_id → key      │ │
│  │ - Monetag    │────▶│              │────▶│   - key → expires_at      │ │
│  │   SDK/Ads    │     │ - Postback   │     └──────────────────────────┘ │
│  │ - Get Key    │     │   handler    │                ▲                 │
│  │   button     │     │ - Luarmor    │                │                 │
│  └──────────────┘     │   API client │                │                 │
│         │             └──────┬───────┘                │                 │
│         │                    │                        │                 │
└─────────┼────────────────────┼────────────────────────┼─────────────────┘
          │                    │                        │
          │                    ▼                        │
          │             ┌──────────────┐                │
          │             │   LUARMOR    │                │
          │             │   - Add User │                │
          │             │   - Key Gen  │                │
          │             │   - Validate │                │
          │             └──────────────┘                │
          │                    ▲                        │
          │                    │                        │
┌─────────┼────────────────────┼────────────────────────┼─────────────────┘
│         │                    │                        │
│  ┌──────┴──────┐     ┌───────┴───────┐                │
│  │  MONETAG    │     │   ROBLOX      │                │
│  │  Ad Network │     │   - UI Key    │────────────────┘
│  │  Postback   │     │   - Validate  │   (ตรวจสอบ key ผ่าน backend)
│  └─────────────┘     │   - Kick      │
│                      └───────────────┘
│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## สิ่งที่ต้องเตรียม

### 1. Monetag
- สมัคร Monetag และสร้าง Zone
- ขอเปิด **Postback** กับ Monetag support
- Postback URL: `https://yourdomain.com/api/postback?ymid={ymid}&event={event_type}`
- SDK บนเว็บ: ใช้ `ymid` = session_id หรือ user_id เพื่อ track ว่าใครกดครบ 10 ครั้ง

### 2. Luarmor
- Whitelist IP ของ backend บน Luarmor dashboard
- Luarmor HTTP API สำหรับ **Add User** (สร้าง key)
- Luarmor 3rd Party External Key Check API สำหรับตรวจสอบ key ใน Roblox (ต้องขอ approval จาก federal)

### 3. Backend (Generator)
- **Postback handler**: รับ Monetag postback, นับ click ต่อ session
- **Key generation**: เมื่อครบ 10 ครั้ง → POST Luarmor API สร้าง key พร้อม `auth_expire = now + 86400` (24 ชม.)
- **Validate API**: endpoint ให้ Roblox เรียกเช็ค key (อาจเรียก Luarmor External Check ต่อ)

### 4. Roblox
- UI สำหรับกรอก key
- Remote/HTTPService เรียก backend เพื่อ validate key
- ตารางตรวจสอบ key เป็นระยะ (เช่นทุก 5–10 นาที) ถ้า expired ให้ kick

---

## จุดที่ต้องระวัง

| หัวข้อ | รายละเอียด |
|--------|-------------|
| Monetag Postback | ต้องติดต่อ support เพื่อเปิดใช้ ไม่มีใน self-service |
| Luarmor 3rd Party API | ต้องขอ project approval และ shared secrets จาก federal |
| HWID | Key จาก Luarmor จะ lock กับ HWID เมื่อมีการใช้ครั้งแรก (ถ้าใช้ External Check API) |
| Session | ใช้ `ymid` หรือ session_id ให้สอดคล้องกันทั้ง Monetag, backend และ frontend |

---

## ตัวอย่าง Logic (Pseudo-code)

### Backend – Postback Handler
```python
# เมื่อ Monetag ส่ง postback มา
@app.get("/api/postback")
def postback(ymid, event_type):
    if event_type == "click":
        count = redis.incr(f"ad_clicks:{ymid}")
        if count >= 10:
            key = create_luarmor_key(auth_expire=now() + 86400)  # 24h
            redis.set(f"key:{ymid}", key, ex=86400)
            redis.delete(f"ad_clicks:{ymid}")  # reset
    return 200
```

### Roblox – Validate + Kick เมื่อหมดอายุ
```lua
-- ตรวจสอบ key เป็นระยะ
local function checkKeyExpired()
    local result = game:GetService("HttpService"):GetAsync(
        "https://yourdomain.com/api/validate?key=" .. playerKey
    )
    if result.valid == false then
        game.Players.LocalPlayer:Kick("Key หมดอายุ กรุณาขอ Key ใหม่ที่เว็บ")
    end
end
task.spawn(function()
    while true do
        checkKeyExpired()
        task.wait(300)  -- เช็คทุก 5 นาที
    end
end)
```

---

*สร้าง Flow Diagram นี้เพื่ออธิบายการเชื่อมต่อ Luarmor + Monetag + Backend + Roblox UI*
