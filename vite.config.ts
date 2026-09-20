import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';
import { formatBugReportLine } from './src/engine/rules/bugReport.ts';

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

  function ensureDir() {
    if (!fs.existsSync(TABLES_DIR)) {
      fs.mkdirSync(TABLES_DIR, { recursive: true });
    }
  }

  const handler = (req: any, res: any, next: any) => {
    const rawUrl = req.url || '';
    const urlPath = rawUrl.split('?')[0];

    if (urlPath === '/api/tables' || urlPath.startsWith('/api/tables/')) {
      ensureDir();
      const parts = urlPath.split('/').filter(Boolean); // ['api', 'tables', optionalId]
      const targetParam = parts[2] ? decodeURIComponent(parts[2]) : null;

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
