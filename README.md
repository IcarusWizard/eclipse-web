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

## Production Deployment (Linux VPS with Docker & Caddy)

This guide covers deploying the game to a remote Linux VPS securely behind a Caddy HTTPS reverse proxy.

### Architecture Overview
- **Application**: Runs in Docker bound strictly to `127.0.0.1:3000` (safe from public port scanners).
- **Reverse Proxy (Caddy)**: Handles HTTPS encryption and reverse-proxies public traffic to `127.0.0.1:3000`.
- **Data Persistence**: Tables, user accounts, and bug reports are stored directly in your host directory (`./server_data` and `./bug_report.md`).

---

### Step 1: VPS Prerequisites

1. **Install Docker, Docker Compose & Caddy**:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose-plugin caddy
   ```

2. **Add a Swapfile (Recommended for 1 GB / 2 GB RAM VPS)**:
   Prevents low-memory servers from freezing during memory spikes:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

---

### Step 2: Configure Environment & Persistent Data

1. **Clone the repository on your VPS**:
   ```bash
   git clone <your-repository-url> eclipse-web
   cd eclipse-web
   ```

2. **Ensure persistent storage files exist**:
   ```bash
   touch bug_report.md
   mkdir -p server_data/tables server_data/users
   ```

3. **Configure `.env`**:
   ```bash
   cp .env.example .env
   nano .env
   ```
   Set `APP_URL` to your live domain (used in email turn reminder links):
   ```env
   APP_URL=https://<your-domain>:<port>
   ```

---

### Step 3: Start the Docker Container

Start the application container:
```bash
docker compose up -d --build
```

Verify that the container is active and bound to `127.0.0.1:3000`:
```bash
docker ps
```

---

### Step 4: Configure Caddy HTTPS Reverse Proxy

Edit `/etc/caddy/Caddyfile`:
```bash
sudo nano /etc/caddy/Caddyfile
```

#### Option A: Standard HTTPS (Default Port 443 with Automatic Let's Encrypt)
```caddy
<your-domain> {
    reverse_proxy 127.0.0.1:3000 {
        header_up Host {upstream_hostport}
    }
}
```

#### Option B: Custom External Port (e.g. `:8443` if port 443 is used by another service)
```caddy
{
    http_port 8080
}

<your-domain>:<port> {
    tls internal
    reverse_proxy 127.0.0.1:3000 {
        header_up Host {upstream_hostport}
    }
}
```

Validate and start Caddy:
```bash
caddy validate --config /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
```

*(Ensure your firewall permits the incoming port: `sudo ufw allow <port>/tcp`).*

---

### Step 5: Fast Future Updates (No VPS Compilation)

To avoid heavy compilation on a modest VPS CPU:
1. **Build locally on your PC / Mac (takes ~0.3s)**:
   ```bash
   bun run build
   git commit -am "Update game" && git push
   ```
2. **Pull and restart on your VPS (takes ~1s, zero CPU load)**:
   ```bash
   git pull
   docker compose restart
   ```

