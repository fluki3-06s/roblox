# Strygon

Monetag + Luarmor Key Generator system for Roblox.

## สถาปัตยกรรม

| ส่วน | เทคโนโลยี |
|------|-----------|
| Frontend | Next.js → Vercel |
| Backend | Go → DigitalOcean VPS |
| Database | Supabase |
| Reverse Proxy | Caddy หรือ Nginx |
| SSL | Let's Encrypt |

## โครงสร้างโปรเจกต์

```
Strygon/
├── frontend/              # Next.js (Vercel)
│   ├── public/
│   │   └── assets/        # Media files
│   │       ├── audio/     # effect.mp3, music*.mp3
│   │       ├── images/games/  # Game thumbnails
│   │       ├── logo/      # logo.png, logo2.png
│   │       └── video/     # video.mp4
│   └── src/
│       ├── app/           # Pages, layout, routes
│       ├── components/
│       │   ├── layout/    # Header, Footer
│       │   ├── home/      # Home page sections
│       │   ├── get-key/   # Get key page
│       │   └── ui/        # Reusable UI primitives
│       └── lib/           # Shared data, utils
├── backend/               # Go API (DigitalOcean VPS)
├── infra/                 # Caddy, Nginx config
└── Luarmor-Monetag-Key-Flow-Diagram.md
```

## การ Deploy

### 1. Frontend (Vercel)

```bash
cd frontend
npm install
# ตั้งค่า env ใน Vercel Dashboard
vercel
```

**Environment Variables:**
- `NEXT_PUBLIC_API_URL` - URL ของ Backend API
- `NEXT_PUBLIC_MONETAG_ZONE` - Monetag Zone ID

### 2. Backend (DigitalOcean VPS)

```bash
cd backend
# ตั้งค่า .env จาก .env.example
go build -o server .
./server
# หรือใช้ Docker
docker build -t strygon-api .
docker run -p 8080:8080 --env-file .env strygon-api
```

**Environment Variables:**
- `PORT` - พอร์ตเซิร์ฟเวอร์ (default: 8080)
- `DATABASE_URL` - Supabase PostgreSQL connection string
- `LUARMOR_API_URL` - Luarmor API base URL
- `LUARMOR_API_KEY` - Luarmor API key

### 3. Reverse Proxy + SSL

**Caddy (แนะนำ - auto SSL):**
```bash
# แก้ api.yourdomain.com ใน Caddyfile
caddy run --config infra/Caddyfile
```

**Nginx + Let's Encrypt:**
```bash
certbot certonly --standalone -d api.yourdomain.com
# แก้ nginx.conf แล้ว reload
nginx -s reload
```

### 4. Monetag Postback

ตั้งค่า Postback URL ใน Monetag:
```
https://api.yourdomain.com/api/postback?ymid={ymid}&event={event_type}
```

## API Endpoints

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/health` | Health check |
| GET | `/api/session/{ymid}/count` | ดูจำนวนคลิก + key (ถ้ามี) |
| POST | `/api/get-key` | สถานะ key (body: `{ymid}`) |
| GET | `/api/postback` | Monetag postback (ymid, event) |
| GET | `/api/validate?key=` | Roblox ตรวจสอบ key |
