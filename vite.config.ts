import { defineConfig, Plugin } from 'vite';
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
          const { username, name, password } = JSON.parse(body || '{}');
          const cleanUsername = String(username || '').trim();
          const cleanName = String(name || '').trim() || cleanUsername;
          const cleanPassword = String(password || '');

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
            fs.writeFileSync(targetPath, JSON.stringify(tableData, null, 2), 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, table: tableData }));
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
                members: data.members || [],
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
          const num = parseInt(targetParam, 10);
          const directFile = path.join(TABLES_DIR, `${targetParam}.json`);
          if (fs.existsSync(directFile)) {
            const content = fs.readFileSync(directFile, 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, table: JSON.parse(content) }));
            return;
          }

          // Search by id or tableNumber inside JSON files
          const files = fs.readdirSync(TABLES_DIR).filter((f) => f.endsWith('.json'));
          for (const file of files) {
            try {
              const content = fs.readFileSync(path.join(TABLES_DIR, file), 'utf-8');
              const data = JSON.parse(content);
              if (data.id === targetParam || (!isNaN(num) && data.tableNumber === num)) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, table: data }));
                return;
              }
            } catch {}
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

            data.savedAt = Date.now();
            const filePath = path.join(TABLES_DIR, `${tableId}.json`);
            if (fs.existsSync(filePath)) {
              try {
                const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                if (existing.members && Array.isArray(existing.members)) {
                  const incomingMembers = data.members || [];
                  const memberMap = new Map();
                  for (const m of existing.members) memberMap.set(m.userId, m);
                  for (const m of incomingMembers) memberMap.set(m.userId, m);
                  data.members = Array.from(memberMap.values());
                }
              } catch {}
            }
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

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
    watch: {
      ignored: ['**/bug_report.md', '**/BackLog.md', '**/.git/**', '**/server_data/**'],
    },
  },
});
