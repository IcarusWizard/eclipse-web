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

export default defineConfig({
  plugins: [react(), tailwindcss(), bugReportPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    watch: {
      ignored: ['**/bug_report.md', '**/BackLog.md', '**/.git/**'],
    },
  },
});
