import { defineConfig, Plugin } from 'vite';
import nodemailer from 'nodemailer';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';
import { formatBugReportLine } from './src/engine/rules/bugReport.ts';
import { generateSalt, hashPasswordSync } from './src/engine/rules/passwordUtils.ts';

function bugReportPlugin(): Plugin {
  const handler = (req: any, res: any, next: any) => {
    const url = req.url?.split('?')[0];
    if (url === '/api/report-bug') {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const line = formatBugReportLine({
              description: data.description || data.text,
              round: data.round,
              phase: data.phase,
              playerName: data.playerName,
              tableNumber: data.tableNumber,
              context: data.context,
            });

            const filePath = path.resolve(process.cwd(), 'bug_report.md');
            if (!fs.existsSync(filePath)) {
              fs.writeFileSync(filePath, '# Bug Reports\n\n', 'utf-8');
            }
            fs.appendFileSync(filePath, line + '\n', 'utf-8');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, line }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
          }
        });
        return;
      }

      if (req.method === 'GET') {
        const filePath = path.resolve(process.cwd(), 'bug_report.md');
        if (!fs.existsSync(filePath)) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ reports: [] }));
          return;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.startsWith('- [ ] ') || l.startsWith('- [x] '));
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ reports: lines }));
        return;
      }
    }
    next();
  };

  return {
    name: 'bug-report-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

function tableStoragePlugin(): Plugin {
  const TABLES_DIR = path.resolve(process.cwd(), 'server_data', 'tables');
  const USERS_DIR = path.resolve(process.cwd(), 'server_data', 'users');
  const ADMIN_FILE = path.resolve(process.cwd(), 'server_data', 'admin.json');

  const userPresence = new Map<string, number>(); // userId -> timestamp
  const userTablePresence = new Map<string, number>(); // `${userId}:${tableId}` -> timestamp
  const recentReminders: any[] = [];
  const lastTurnReminderSent = new Map<string, number>(); // `${tableId}:${seat}:${round}:${phase}` -> timestamp

  function getEnvConfig(): Record<string, string> {
    const envFile = path.resolve(process.cwd(), '.env');
    const env: Record<string, string> = {};
    if (fs.existsSync(envFile)) {
      try {
        const lines = fs.readFileSync(envFile, 'utf-8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const k = trimmed.substring(0, eqIdx).trim();
            let v = trimmed.substring(eqIdx + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.slice(1, -1);
            }
            env[k] = v;
          }
        }
      } catch {}
    }
    // OS / Cloud container environment variables take precedence over .env file
    for (const [k, v] of Object.entries(process.env)) {
      if (typeof v === 'string' && v.trim() !== '') {
        env[k] = v.trim();
      }
    }
    return env;
  }

  function isUserOnline(userId?: string | null, tableId?: string | null): boolean {
    if (!userId) return false;
    const now = Date.now();
    const lastGlobal = userPresence.get(userId) || 0;
    if (now - lastGlobal < 45000) return true;
    if (tableId) {
      const lastTable = userTablePresence.get(`${userId}:${tableId}`) || 0;
      if (now - lastTable < 45000) return true;
    }
    return false;
  }

  async function sendTurnReminderEmail({
    toEmail,
    username,
    tableNumber,
    tableId,
    seatIndex,
    factionName,
    round,
    phase,
  }: {
    toEmail: string;
    username: string;
    tableNumber: number | string;
    tableId: string;
    seatIndex: number;
    factionName?: string;
    round?: number;
    phase?: string;
  }) {
    const env = getEnvConfig();
    const host = env.SMTP_HOST || 'smtp-relay.brevo.com';
    const port = parseInt(env.SMTP_PORT || '587', 10);
    const secure = env.SMTP_SECURE === 'true' || port === 465;
    const user = env.SMTP_USER;
    const pass = env.SMTP_PASS;
    const from = env.SMTP_FROM || `"Eclipse High Command" <${user}>`;
    const appUrl = env.APP_URL || 'http://localhost:3000';
    const directLink = `${appUrl}/?table=${tableId || tableNumber}&seat=${seatIndex}`;

    if (!user || !pass) {
      console.log(`[Turn Reminder] (Mock Mode - No SMTP credentials) To: ${toEmail} | Link: ${directLink}`);
      return { success: true, mock: true };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    const mailOptions = {
      from,
      to: toEmail,
      subject: `[Eclipse: Second Dawn] Commander ${username}, it's your turn on Table #${tableNumber}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; padding: 24px; margin: 0; }
            .card { max-width: 580px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
            .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border-bottom: 1px solid #334155; padding: 24px; text-align: center; }
            .title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #38bdf8; text-transform: uppercase; }
            .subtitle { margin: 6px 0 0; font-size: 11px; color: #94a3b8; font-family: monospace; letter-spacing: 1px; }
            .content { padding: 28px 24px; }
            .alert-box { background: rgba(56, 189, 248, 0.08); border-left: 4px solid #38bdf8; padding: 14px 18px; border-radius: 6px; margin-bottom: 22px; }
            .info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .info-table td { padding: 9px 0; border-bottom: 1px solid #1e293b; font-size: 14px; }
            .info-label { color: #94a3b8; width: 130px; font-weight: 600; }
            .info-val { color: #f1f5f9; font-weight: 700; }
            .btn-container { text-align: center; margin: 28px 0 16px; }
            .btn { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 700; border-radius: 8px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 14px 0 rgba(2, 132, 199, 0.39); }
            .url-box { background: #020617; border: 1px dashed #334155; border-radius: 6px; padding: 12px; margin-top: 20px; font-size: 12px; color: #94a3b8; word-break: break-all; font-family: monospace; }
            .footer { text-align: center; padding: 16px; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; background: #0b1120; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1 class="title">🌌 ECLIPSE: SECOND DAWN</h1>
              <p class="subtitle">TACTICAL ASTROGATION DISPATCH</p>
            </div>
            <div class="content">
              <div class="alert-box">
                <strong style="color: #38bdf8; font-size: 15px;">Commander ${username}, the galaxy awaits your orders!</strong>
                <p style="margin: 6px 0 0; color: #cbd5e1; font-size: 13px;">It is now your turn to command the <b>${factionName || 'Fleet'}</b> on Table #${tableNumber}.</p>
              </div>

              <table class="info-table">
                <tr>
                  <td class="info-label">Table:</td>
                  <td class="info-val">Table #${tableNumber}</td>
                </tr>
                <tr>
                  <td class="info-label">Your Faction:</td>
                  <td class="info-val" style="color: #38bdf8;">${factionName || 'Commander'}</td>
                </tr>
                ${round ? `<tr><td class="info-label">Round:</td><td class="info-val">Round ${round} / 8</td></tr>` : ''}
                ${phase ? `<tr><td class="info-label">Phase:</td><td class="info-val" style="color: #34d399;">${phase.replace(/_/g, ' ')}</td></tr>` : ''}
              </table>

              <div class="btn-container">
                <a href="${directLink}" class="btn">▶ TAKE YOUR TURN</a>
              </div>

              <div class="url-box">
                <div style="color: #cbd5e1; margin-bottom: 4px; font-weight: bold;">Direct Cockpit Link:</div>
                <a href="${directLink}" style="color: #38bdf8; text-decoration: none;">${directLink}</a>
                <div style="color: #64748b; font-size: 10px; margin-top: 6px;">(Or copy and paste this link into your browser)</div>
              </div>
            </div>
            <div class="footer">
              Eclipse: Second Dawn for the Galaxy — Asynchronous Turn Reminder Service
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Turn Reminder] ✉️ Dispatched email to ${toEmail} for Table #${tableNumber} (Seat ${seatIndex + 1}): ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error(`[Turn Reminder] ❌ Error sending email to ${toEmail}:`, err?.message || err);
      return { success: false, error: err?.message || 'Email delivery failed' };
    }
  }

  function ensureDir() {
    if (!fs.existsSync(TABLES_DIR)) {
      fs.mkdirSync(TABLES_DIR, { recursive: true });
    }
  }

  function ensureUsersDir() {
    if (!fs.existsSync(USERS_DIR)) {
      fs.mkdirSync(USERS_DIR, { recursive: true });
    }
  }

  function getAdminHash(): { salt: string; passwordHash: string } | null {
    if (fs.existsSync(ADMIN_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf-8'));
        if (data && data.salt && data.passwordHash) {
          return data;
        }
      } catch {}
    }
    const envPass = process.env.ADMIN_PASSWORD || process.env.ADMIN_INITIAL_PASSWORD;
    if (envPass) {
      const salt = generateSalt();
      const passwordHash = hashPasswordSync(envPass, salt);
      const adminData = { salt, passwordHash, updatedAt: Date.now() };
      try {
        const dir = path.dirname(ADMIN_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminData, null, 2), 'utf-8');
      } catch {}
      return adminData;
    }
    return null;
  }

  const handler = (req: any, res: any, next: any) => {
    const rawUrl = req.url || '';
    const urlPath = rawUrl.split('?')[0];

    // Presence 1: Heartbeat Ping
    if (urlPath === '/api/presence' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const { userId, tableId } = JSON.parse(body || '{}');
          if (userId) {
            userPresence.set(userId, Date.now());
            if (tableId) {
              userTablePresence.set(`${userId}:${tableId}`, Date.now());
            }
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, isOnline: true }));
        } catch {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
        }
      });
      return;
    }

    // Presence 2: Check status
    if (urlPath === '/api/presence/status' && req.method === 'GET') {
      const qIndex = rawUrl.indexOf('?');
      const params = new URLSearchParams(qIndex >= 0 ? rawUrl.substring(qIndex) : '');
      const userId = params.get('userId');
      const tableId = params.get('tableId');
      const online = isUserOnline(userId, tableId);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, isOnline: online, lastSeen: userId ? userPresence.get(userId) || null : null }));
      return;
    }

    // Notifications: List recent sent reminders
    if (urlPath === '/api/notifications/recent' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, notifications: recentReminders.slice(-20) }));
      return;
    }

    // Auth 0: Check whether administrator password has been configured
    if (urlPath === '/api/auth/admin/status' && req.method === 'GET') {
      const adminData = getAdminHash();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ isConfigured: adminData !== null }));
      return;
    }

    // Auth 0b: Setup initial administrator password (only allowed if not yet configured)
    if (urlPath === '/api/auth/admin/setup' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const currentAdmin = getAdminHash();
          if (currentAdmin !== null) {
            res.statusCode = 403;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Administrator account has already been initialized.' }));
            return;
          }

          const { newPassword } = JSON.parse(body || '{}');
          const cleanPass = String(newPassword || '').trim();
          if (!cleanPass || cleanPass.length < 3) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Administrator password must be at least 3 characters.' }));
            return;
          }

          const salt = generateSalt();
          const passwordHash = hashPasswordSync(cleanPass, salt);
          const adminData = { salt, passwordHash, updatedAt: Date.now() };
          const dir = path.dirname(ADMIN_FILE);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(ADMIN_FILE, JSON.stringify(adminData, null, 2), 'utf-8');

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, message: 'Administrator initialized successfully.' }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
        }
      });
      return;
    }

    // Auth 1: Verify Administrator Password (Encrypted hash comparison only)
    if (urlPath === '/api/auth/verify-admin' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          const cleanPass = String(data.password || '');
          const adminData = getAdminHash();

          if (!adminData) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                success: false,
                error: 'Administrator has not been initialized yet. Please set up the administrator password.',
              })
            );
            return;
          }

          const inputHash = hashPasswordSync(cleanPass, adminData.salt);
          if (inputHash === adminData.passwordHash) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } else {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Incorrect administrator password.' }));
          }
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
        }
      });
      return;
    }

    // Auth 2: User Registration with Encrypted Password
    if (urlPath === '/api/auth/register' && req.method === 'POST') {
      ensureUsersDir();
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const { username, name, password, email, emailNotifications } = JSON.parse(body || '{}');
          const cleanUsername = String(username || '').trim();
          const cleanName = String(name || '').trim() || cleanUsername;
          const cleanPassword = String(password || '');
          const cleanEmail = typeof email === 'string' && email.trim() ? email.trim() : undefined;
          const notificationsEnabled = emailNotifications !== false;

          if (!cleanUsername || cleanUsername.length < 2) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Username must be at least 2 characters.' }));
            return;
          }
          if (!cleanPassword || cleanPassword.length < 3) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Password must be at least 3 characters.' }));
            return;
          }

          // Case-insensitive duplicate username check
          const files = fs.readdirSync(USERS_DIR).filter((f) => f.endsWith('.json'));
          for (const f of files) {
            try {
              const existing = JSON.parse(fs.readFileSync(path.join(USERS_DIR, f), 'utf-8'));
              if (existing.username && existing.username.toLowerCase() === cleanUsername.toLowerCase()) {
                res.statusCode = 409;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: `Commander username "${cleanUsername}" is already registered.` }));
                return;
              }
            } catch {}
          }

          const salt = generateSalt();
          const passwordHash = hashPasswordSync(cleanPassword, salt);
          const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const userAccount = {
            id: userId,
            username: cleanUsername,
            name: cleanName,
            role: 'user',
            email: cleanEmail,
            emailNotifications: notificationsEnabled,
            salt,
            passwordHash,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          const safeFilename = cleanUsername.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
          fs.writeFileSync(path.join(USERS_DIR, `${safeFilename}.json`), JSON.stringify(userAccount, null, 2), 'utf-8');

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              user: {
                id: userAccount.id,
                username: userAccount.username,
                name: userAccount.name,
                role: userAccount.role,
                email: userAccount.email,
                emailNotifications: userAccount.emailNotifications,
                createdAt: userAccount.createdAt,
                lastActiveAt: Date.now(),
              },
            })
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
        }
      });
      return;
    }

    // Auth 2b: Update User Profile (email, notification preference, display name)
    if (urlPath === '/api/auth/update-profile' && req.method === 'POST') {
      ensureUsersDir();
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const { userId, email, emailNotifications, name } = JSON.parse(body || '{}');
          if (!userId) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Missing userId' }));
            return;
          }

          const files = fs.readdirSync(USERS_DIR).filter((f) => f.endsWith('.json'));
          let foundUser: any = null;
          let foundPath = '';
          for (const f of files) {
            try {
              const u = JSON.parse(fs.readFileSync(path.join(USERS_DIR, f), 'utf-8'));
              if (u.id === userId) {
                foundUser = u;
                foundPath = path.join(USERS_DIR, f);
                break;
              }
            } catch {}
          }

          if (!foundUser) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'User account not found' }));
            return;
          }

          if (typeof name === 'string') foundUser.name = name.trim() || foundUser.username;
          if (typeof email === 'string') foundUser.email = email.trim();
          if (typeof emailNotifications === 'boolean') foundUser.emailNotifications = emailNotifications;
          foundUser.updatedAt = Date.now();

          fs.writeFileSync(foundPath, JSON.stringify(foundUser, null, 2), 'utf-8');

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              user: {
                id: foundUser.id,
                username: foundUser.username,
                name: foundUser.name,
                role: foundUser.role,
                email: foundUser.email,
                emailNotifications: foundUser.emailNotifications !== false,
                createdAt: foundUser.createdAt,
                lastActiveAt: Date.now(),
              },
            })
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
        }
      });
      return;
    }

    // Auth 3: User Login with Password Verification
    if (urlPath === '/api/auth/login' && req.method === 'POST') {
      ensureUsersDir();
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const { username, password } = JSON.parse(body || '{}');
          const cleanUsername = String(username || '').trim().toLowerCase();
          const cleanPassword = String(password || '');

          if (!cleanUsername || !cleanPassword) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Please enter both username and password.' }));
            return;
          }

          const files = fs.readdirSync(USERS_DIR).filter((f) => f.endsWith('.json'));
          let foundUser: any = null;
          let foundPath = '';
          for (const f of files) {
            try {
              const u = JSON.parse(fs.readFileSync(path.join(USERS_DIR, f), 'utf-8'));
              if (u.username && u.username.toLowerCase() === cleanUsername) {
                foundUser = u;
                foundPath = path.join(USERS_DIR, f);
                break;
              }
            } catch {}
          }

          if (!foundUser) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: `No commander found with username "${username}". Please register first.` }));
            return;
          }

          const inputHash = hashPasswordSync(cleanPassword, foundUser.salt);
          if (inputHash !== foundUser.passwordHash) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Incorrect password.' }));
            return;
          }

          foundUser.updatedAt = Date.now();
          fs.writeFileSync(foundPath, JSON.stringify(foundUser, null, 2), 'utf-8');

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              user: {
                id: foundUser.id,
                username: foundUser.username,
                name: foundUser.name,
                role: foundUser.role,
                email: foundUser.email,
                emailNotifications: foundUser.emailNotifications !== false,
                createdAt: foundUser.createdAt,
                lastActiveAt: Date.now(),
              },
            })
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
        }
      });
      return;
    }

    // Auth 4: Admin List Registered Users (excluding password hashes)
    if (urlPath === '/api/auth/admin/users' && req.method === 'GET') {
      ensureUsersDir();
      try {
        const files = fs.readdirSync(USERS_DIR).filter((f) => f.endsWith('.json'));
        const userList: any[] = [];
        for (const f of files) {
          try {
            const u = JSON.parse(fs.readFileSync(path.join(USERS_DIR, f), 'utf-8'));
            userList.push({
              id: u.id,
              username: u.username,
              name: u.name,
              role: u.role || 'user',
              createdAt: u.createdAt || Date.now(),
              updatedAt: u.updatedAt || Date.now(),
            });
          } catch {}
        }
        userList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, users: userList }));
      } catch (err: any) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
      }
      return;
    }

    // Auth 5: Admin Change Password for Any User
    if (urlPath === '/api/auth/admin/change-password' && req.method === 'POST') {
      ensureUsersDir();
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const { targetUserId, targetUsername, newPassword } = JSON.parse(body || '{}');
          const cleanNewPass = String(newPassword || '');
          if (!cleanNewPass || cleanNewPass.length < 3) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'New password must be at least 3 characters.' }));
            return;
          }

          const files = fs.readdirSync(USERS_DIR).filter((f) => f.endsWith('.json'));
          let targetUser: any = null;
          let targetFilePath = '';
          for (const f of files) {
            try {
              const u = JSON.parse(fs.readFileSync(path.join(USERS_DIR, f), 'utf-8'));
              if (
                (targetUserId && u.id === targetUserId) ||
                (targetUsername && u.username && u.username.toLowerCase() === String(targetUsername).toLowerCase())
              ) {
                targetUser = u;
                targetFilePath = path.join(USERS_DIR, f);
                break;
              }
            } catch {}
          }

          if (!targetUser) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Target commander account not found.' }));
            return;
          }

          const newSalt = generateSalt();
          const newPasswordHash = hashPasswordSync(cleanNewPass, newSalt);
          targetUser.salt = newSalt;
          targetUser.passwordHash = newPasswordHash;
          targetUser.updatedAt = Date.now();

          fs.writeFileSync(targetFilePath, JSON.stringify(targetUser, null, 2), 'utf-8');

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              message: `Password for commander "${targetUser.username}" has been successfully updated.`,
            })
          );
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
        }
      });
      return;
    }

    // Auth 6: Admin Change Administrator Password
    if (urlPath === '/api/auth/admin/change-admin-password' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const { currentPassword, newPassword } = JSON.parse(body || '{}');
          const cleanNewPass = String(newPassword || '');
          if (!cleanNewPass || cleanNewPass.length < 3) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'New administrator password must be at least 3 characters.' }));
            return;
          }

          const adminData = getAdminHash();
          if (!adminData) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Administrator has not been initialized yet.' }));
            return;
          }

          const curHash = hashPasswordSync(String(currentPassword || ''), adminData.salt);
          if (curHash !== adminData.passwordHash) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Current administrator password is incorrect.' }));
            return;
          }

          const newSalt = generateSalt();
          const newPasswordHash = hashPasswordSync(cleanNewPass, newSalt);
          const updatedAdmin = { salt: newSalt, passwordHash: newPasswordHash, updatedAt: Date.now() };
          fs.writeFileSync(ADMIN_FILE, JSON.stringify(updatedAdmin, null, 2), 'utf-8');

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, message: 'Administrator password updated successfully.' }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
        }
      });
      return;
    }

    if (urlPath === '/api/tables' || urlPath.startsWith('/api/tables/')) {
      ensureDir();
      const parts = urlPath.split('/').filter(Boolean); // ['api', 'tables', optionalId, optionalAction]
      const targetParam = parts[2] ? decodeURIComponent(parts[2]) : null;

      // 0. POST /api/tables/:id/join -> register user as table member
      if (req.method === 'POST' && targetParam && parts[3] === 'join') {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const { member } = JSON.parse(body || '{}');
            if (!member || !member.userId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Missing member data' }));
              return;
            }
            const filePath = path.join(TABLES_DIR, `${targetParam}.json`);
            let tableData: any = null;
            if (fs.existsSync(filePath)) {
              tableData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
            if (!tableData) {
              const num = parseInt(targetParam, 10);
              const files = fs.readdirSync(TABLES_DIR).filter((f) => f.endsWith('.json'));
              for (const file of files) {
                const c = JSON.parse(fs.readFileSync(path.join(TABLES_DIR, file), 'utf-8'));
                if (c.id === targetParam || (!isNaN(num) && c.tableNumber === num)) {
                  tableData = c;
                  break;
                }
              }
            }
            if (!tableData) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Table not found' }));
              return;
            }
            tableData.members = tableData.members || [];
            if (typeof member.seat === 'number') {
              const seatOccupant = tableData.members.find(
                (m: any) => m.seat === member.seat && m.userId !== member.userId
              );
              if (seatOccupant) {
                res.statusCode = 409;
                res.setHeader('Content-Type', 'application/json');
                const occName = seatOccupant.username || seatOccupant.name || 'another player';
                res.end(
                  JSON.stringify({
                    success: false,
                    error: `Seat ${member.seat + 1} is already occupied by ${occName}.`,
                  })
                );
                return;
              }
            }
            const existingIdx = tableData.members.findIndex((m: any) => m.userId === member.userId);
            if (existingIdx >= 0) {
              const prev = tableData.members[existingIdx];
              if (prev.seat === member.seat && prev.role === member.role && prev.username === member.username) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, members: tableData.members }));
                return;
              }
              tableData.members[existingIdx] = {
                ...tableData.members[existingIdx],
                ...member,
                joinedAt: Date.now(),
              };
            } else {
              tableData.members.push({
                ...member,
                joinedAt: Date.now(),
              });
            }
            tableData.savedAt = Date.now();
            const targetPath = path.join(TABLES_DIR, `${tableData.id}.json`);
            fs.writeFileSync(targetPath, JSON.stringify(tableData), 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, members: tableData.members }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
          }
        });
        return;
      }

      // 1. GET /api/tables -> list all table summaries
      if (req.method === 'GET' && !targetParam) {
        try {
          const files = fs.readdirSync(TABLES_DIR).filter((f) => f.endsWith('.json'));
          const list: any[] = [];
          for (const file of files) {
            try {
              const content = fs.readFileSync(path.join(TABLES_DIR, file), 'utf-8');
              const data = JSON.parse(content);
              const activePlayer = data.players?.[data.activePlayerIndex];
              let effectiveActiveSeat = typeof data.activePlayerIndex === 'number' ? data.activePlayerIndex : 0;
              if (data.phase === 'COMBAT_PHASE' && data.combat?.activePlayerId) {
                const cIdx = data.players?.findIndex((p: any) => p.id === data.combat.activePlayerId);
                if (typeof cIdx === 'number' && cIdx >= 0) effectiveActiveSeat = cIdx;
              }
              list.push({
                id: data.id,
                tableNumber: data.tableNumber,
                savedAt: data.savedAt || fs.statSync(path.join(TABLES_DIR, file)).mtimeMs,
                round: data.round,
                maxRounds: data.maxRounds,
                phase: data.phase,
                playerCount: data.players?.length || 0,
                playerNames: data.players?.map((p: any) => `${p.name} (${p.faction?.name || ''})`) || [],
                activePlayerName: activePlayer ? activePlayer.name : 'Unknown',
                activePlayerIndex: effectiveActiveSeat,
                hasReplay: Boolean(
                  data.replaySteps &&
                  data.replaySteps.length > 0 &&
                  !(data.round > 1 && (data.replaySteps[0]?.round > 1 || data.replaySteps[0]?.actionType !== 'GAME_SETUP'))
                ),
                replayStepsCount: data.replaySteps?.length || 0,
              });
            } catch {}
          }
          list.sort((a, b) => b.savedAt - a.savedAt);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, tables: list }));
          return;
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
          return;
        }
      }

      // 2. GET /api/tables/:id (lookup by ID or 3-digit tableNumber)
      if (req.method === 'GET' && targetParam) {
        try {
          const qIndex = rawUrl.indexOf('?');
          const queryParams = new URLSearchParams(qIndex >= 0 ? rawUrl.substring(qIndex) : '');
          const includeReplay = queryParams.get('includeReplay') === 'true';

          const sanitizeTable = (t: any) => {
            if (!t) return t;
            if (!includeReplay && t.replaySteps) {
              const { replaySteps, ...rest } = t;
              const hasValidReplay = Boolean(
                replaySteps &&
                replaySteps.length > 0 &&
                !(t.round > 1 && (replaySteps[0]?.round > 1 || replaySteps[0]?.actionType !== 'GAME_SETUP'))
              );
              return {
                ...rest,
                hasReplay: hasValidReplay,
                replayStepsCount: Array.isArray(replaySteps) ? replaySteps.length : 0,
              };
            }
            return t;
          };

          const sendTableResponse = (rawTable: any, sourceFile?: string) => {
            const savedAt = String(
              rawTable.savedAt ||
              (sourceFile && fs.existsSync(sourceFile) ? fs.statSync(sourceFile).mtimeMs : Date.now())
            );
            const ifNoneMatch = req.headers['if-none-match'];

            // If client already has this exact version and isn't asking for full replay history, return 304 Not Modified (0 bytes transferred)
            if (ifNoneMatch && ifNoneMatch === savedAt && !includeReplay) {
              res.statusCode = 304;
              res.setHeader('ETag', savedAt);
              res.setHeader('Cache-Control', 'no-cache');
              res.end();
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('ETag', savedAt);
            res.setHeader('Cache-Control', 'no-cache');
            res.end(JSON.stringify({ success: true, table: sanitizeTable(rawTable) }));
          };

          const num = parseInt(targetParam, 10);
          const directFile = path.join(TABLES_DIR, `${targetParam}.json`);
          if (fs.existsSync(directFile)) {
            const content = fs.readFileSync(directFile, 'utf-8');
            sendTableResponse(JSON.parse(content), directFile);
            return;
          }

          const galaxyFile = path.join(TABLES_DIR, `galaxy-${targetParam}.json`);
          if (fs.existsSync(galaxyFile)) {
            const content = fs.readFileSync(galaxyFile, 'utf-8');
            sendTableResponse(JSON.parse(content), galaxyFile);
            return;
          }

          // Search by id or tableNumber inside JSON files
          const files = fs.readdirSync(TABLES_DIR).filter((f) => f.endsWith('.json'));
          const candidates: any[] = [];
          for (const file of files) {
            try {
              const content = fs.readFileSync(path.join(TABLES_DIR, file), 'utf-8');
              const data = JSON.parse(content);
              if (data.id === targetParam || (!isNaN(num) && data.tableNumber === num)) {
                candidates.push(data);
              }
            } catch {}
          }

          if (candidates.length > 0) {
            candidates.sort((a, b) => {
              if (a.id === targetParam) return -1;
              if (b.id === targetParam) return 1;
              if (a.id === `galaxy-${targetParam}`) return -1;
              if (b.id === `galaxy-${targetParam}`) return 1;
              return (b.savedAt || 0) - (a.savedAt || 0);
            });
            sendTableResponse(candidates[0]);
            return;
          }

          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: `Table ${targetParam} not found` }));
          return;
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
          return;
        }
      }

      // 3. POST /api/tables/:id or POST /api/tables
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body || '{}');
            const tableId = targetParam || data.id;
            if (!tableId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Missing table ID' }));
              return;
            }

            const filePath = path.join(TABLES_DIR, `${tableId}.json`);
            data.savedAt = Date.now();
            let existing: any = null;
            if (fs.existsSync(filePath)) {
              try {
                existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                if (existing.members && Array.isArray(existing.members)) {
                  const incomingMembers = data.members || [];
                  const memberMap = new Map();
                  for (const m of existing.members) memberMap.set(m.userId, m);
                  for (const m of incomingMembers) memberMap.set(m.userId, m);
                  data.members = Array.from(memberMap.values());
                }
                // Preserve & merge historical replaySteps so live sync never wipes out history
                if (existing.replaySteps && Array.isArray(existing.replaySteps) && existing.replaySteps.length > 0) {
                  if (!data.replaySteps || !Array.isArray(data.replaySteps) || data.replaySteps.length === 0) {
                    data.replaySteps = existing.replaySteps;
                    data.hasReplay = true;
                    data.replayStepsCount = existing.replaySteps.length;
                  } else if (data.replaySteps.length < existing.replaySteps.length) {
                    const merged = [...existing.replaySteps];
                    for (const step of data.replaySteps) {
                      const exists = merged.some(
                        (s: any) =>
                          s.stepIndex === step.stepIndex ||
                          (s.timestamp === step.timestamp && s.actionType === step.actionType)
                      );
                      if (!exists) {
                        merged.push({ ...step, stepIndex: merged.length });
                      }
                    }
                    data.replaySteps = merged;
                    data.hasReplay = true;
                    data.replayStepsCount = merged.length;
                  }
                }
              } catch {}
            }
            fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');

            // BGA-style Turn Reminder Trigger
            if (
              existing &&
              data &&
              data.phase !== 'GAME_OVER' &&
              Array.isArray(data.players) &&
              data.players.length > 0
            ) {
              let targetSeat = typeof data.activePlayerIndex === 'number' ? data.activePlayerIndex : -1;
              if (data.phase === 'COMBAT_PHASE' && data.combat?.activePlayerId) {
                const cIdx = data.players.findIndex((p: any) => p.id === data.combat.activePlayerId);
                if (cIdx >= 0) targetSeat = cIdx;
              }

              let oldSeat = typeof existing.activePlayerIndex === 'number' ? existing.activePlayerIndex : -1;
              if (existing.phase === 'COMBAT_PHASE' && existing.combat?.activePlayerId) {
                const oIdx = existing.players?.findIndex((p: any) => p.id === existing.combat.activePlayerId);
                if (oIdx >= 0) oldSeat = oIdx;
              }

              const isTurnTransition = (oldSeat !== targetSeat) || (existing.phase !== data.phase && data.phase === 'ACTION_PHASE');
              if (isTurnTransition && targetSeat >= 0 && targetSeat < data.players.length) {
                const targetPlayer = data.players[targetSeat];
                const targetMember = data.members?.find((m: any) => m.seat === targetSeat);

                let targetEmail = targetMember?.email;
                let targetUserId = targetMember?.userId;
                let targetUsername = targetMember?.username || targetPlayer?.name || `Commander ${targetSeat + 1}`;
                let emailNotifications = targetMember?.emailNotifications !== false;

                // Look up user account if email not directly on member
                if (targetUserId) {
                  try {
                    const files = fs.readdirSync(USERS_DIR).filter((f) => f.endsWith('.json'));
                    for (const f of files) {
                      const u = JSON.parse(fs.readFileSync(path.join(USERS_DIR, f), 'utf-8'));
                      if (u.id === targetUserId) {
                        if (!targetEmail) targetEmail = u.email;
                        if (typeof u.emailNotifications === 'boolean') emailNotifications = u.emailNotifications;
                        if (u.username) targetUsername = u.username;
                        break;
                      }
                    }
                  } catch {}
                }

                if (targetEmail && emailNotifications) {
                  const online = isUserOnline(targetUserId, tableId);
                  if (!online) {
                    const reminderKey = `${tableId}:${targetSeat}:${data.round}:${data.phase}`;
                    const now = Date.now();
                    const lastSent = lastTurnReminderSent.get(reminderKey) || 0;
                    // Deduplicate within 5 minutes for the exact same turn
                    if (now - lastSent > 300_000) {
                      lastTurnReminderSent.set(reminderKey, now);
                      sendTurnReminderEmail({
                        toEmail: targetEmail,
                        username: targetUsername,
                        tableNumber: data.tableNumber || tableId,
                        tableId,
                        seatIndex: targetSeat,
                        factionName: targetPlayer?.faction?.name || targetPlayer?.name,
                        round: data.round,
                        phase: data.phase,
                      }).then((res) => {
                        recentReminders.push({
                          id: `rem_${Date.now()}`,
                          to: targetEmail,
                          username: targetUsername,
                          tableNumber: data.tableNumber || tableId,
                          seat: targetSeat,
                          round: data.round,
                          phase: data.phase,
                          sentAt: Date.now(),
                          success: res.success,
                        });
                      });
                    }
                  }
                }
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, tableId, tableNumber: data.tableNumber }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
          }
        });
        return;
      }

      // 4. DELETE /api/tables/:id
      if (req.method === 'DELETE' && targetParam) {
        try {
          const directFile = path.join(TABLES_DIR, `${targetParam}.json`);
          if (fs.existsSync(directFile)) {
            fs.unlinkSync(directFile);
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true }));
          return;
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Server error' }));
          return;
        }
      }
    }
    next();
  };

  return {
    name: 'table-storage-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), bugReportPlugin(), tableStoragePlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/bug_report.md', '**/BackLog.md', '**/.git/**', '**/server_data/**'],
    },
  },
  preview: {
    port: parseInt(process.env.PORT || '3000', 10),
    host: true,
    allowedHosts: true,
  },
});

