# Eclipse: Second Dawn for the Galaxy (Web Edition)

A full-featured web implementation of **Eclipse: Second Dawn for the Galaxy**, featuring real-time multiplayer, persistent galaxy tables, encrypted commander authentication, spectator mode, tactical galaxy map, and asynchronous BGA-style email turn reminders.

---

## Quick Start

### 1. Install Dependencies
```bash
bun install
```

### 2. Run the Development Server
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Tests
```bash
bun test
```

---

## Automated Email Turn Reminders (BGA-Style)

The server supports automated email notifications when it becomes an offline player's turn to move (similar to Board Game Arena).

### Setup Instructions

1. **Copy the Environment Template**:
   ```bash
   cp .env.example .env
   ```

2. **Configure your SMTP Provider** in `.env`:

   ```env
   # SMTP Relay Host & Port
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_SECURE=false

   # SMTP Credentials
   SMTP_USER=your_login@smtp-brevo.com
   SMTP_PASS=your_smtp_key_or_password

   # Sender Address (must be a verified sender in your SMTP provider)
   SMTP_FROM="Eclipse High Command <notifications@yourdomain.com>"

   # Public or Local Application URL (used in direct cockpit join links)
   APP_URL=http://localhost:3000
   ```

### Recommended Provider: Brevo (formerly Sendinblue)
- **Free Tier**: 300 emails/day at zero cost.
- **Setup**:
  1. Register at [brevo.com](https://www.brevo.com).
  2. Navigate to **Transactional** → **Settings** → **Configuration** to retrieve your `SMTP Server`, `Port`, and `Login`.
  3. Generate an SMTP key under **Generate a new SMTP key** (`SMTP_PASS`).
  4. Under **Senders & IP**, add and verify your sender email (e.g. `your_email@domain.com`). Set this email in `SMTP_FROM`.

### Alternative Providers
- **Gmail**: Set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=your_gmail@gmail.com`, and generate an [App Password](https://myaccount.google.com/apppasswords) for `SMTP_PASS`.
- **SendGrid / Postmark / Amazon SES**: Any standard SMTP relay is supported.

### Fallback: Mock Mode
If `SMTP_USER` or `SMTP_PASS` are omitted or blank, the server will **not fail**. It automatically enters **Mock Mode**, logging email notifications and direct join links to the terminal without attempting network delivery:
```text
[Turn Reminder] (Mock Mode - No SMTP credentials) To: player@example.com | Link: http://localhost:3000/?table=101&seat=1
```

---

## How Turn Reminders Work

1. **Presence Detection**: Connected players send a heartbeat every 20 seconds. Players inactive or away for >45 seconds are marked **offline**.
2. **Turn Transitions**: When a turn advances in the action phase or combat phase, the server checks if the incoming active commander is offline.
3. **Automated Dispatch**: If the player has configured an email and enabled notifications, a tactical dispatch email is delivered with a direct cockpit join link.
4. **Anti-Spam Cooldown**: Reminders are deduplicated per table and seat with a 5-minute cooldown to prevent spam during rapid state transitions.
5. **Player Controls**: Players can configure their email and notification toggle during registration or in the Commander tab (**"Turn Reminders & Notifications"**) of the User Identity modal.

---

## Production Deployment

When deploying to a public server (VPS, Docker, Render, Railway, Fly.io, etc.), follow these essentials:

### 1. Update `APP_URL`
Set `APP_URL` to your live domain (e.g. `https://eclipse.yourdomain.com`).
> **Important**: If left as `localhost:3000`, the links inside turn reminder emails will point to `localhost`, which other players cannot open from their devices.

### 2. Configure Cloud Environment Variables
In cloud hosting dashboards (Render, Railway, Fly.io, Heroku), add the variables directly into their **Environment Variables / Secrets** settings:
- `APP_URL`: `https://your-app-domain.com`
- `SMTP_HOST`: `smtp-relay.brevo.com`
- `SMTP_PORT`: `587`
- `SMTP_USER`: `your_login`
- `SMTP_PASS`: `your_key`
- `SMTP_FROM`: `"Eclipse High Command <notifications@yourdomain.com>"`

### 3. Persist Game & User Data (`server_data/`)
The server persists active tables, user profiles, and encrypted passwords in `./server_data`.
- **Docker**: Mount a persistent volume: `-v eclipse_data:/app/server_data`.
- **PaaS (Render, Fly.io, Railway)**: Attach a persistent disk mounted to `/app/server_data`.

### 4. Running in Production

#### Option A: Docker / Docker Compose (Recommended)
```bash
docker compose up -d --build
```

#### Option B: Standalone Bun Service
```bash
# 1. Build optimized frontend bundle
bun run build

# 2. Start production server (binds to $PORT or 3000 on 0.0.0.0)
bun run start
```
