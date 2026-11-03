import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/api';
import { closePostgresPool } from './src/server/db/postgresPool';
import path from 'node:path';

const app = express();
const isVercel = process.env.VERCEL === '1';
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Existing API routes
app.use('/api/v1', apiRouter);

app.get('/api', (_req, res) => {
  res.json({
    message: 'AgroPulse Core API',
    documentation: '/api/v1/health',
    status: 'operational',
  });
});

// Vercel detects and deploys this Express application.
export default app;

// Start a local server only outside Vercel.
async function startLocalServer() {
  if (isProduction) {
    const publicPath = path.resolve(process.cwd(), 'public');
    app.use(express.static(publicPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AgroPulse Full-Stack] Server running on port ${PORT}`);
    console.log(`[AgroPulse API v1] Endpoints ready at http://localhost:${PORT}/api/v1`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[AgroPulse] Received ${signal}. Draining connections and shutting down...`);
    server.close(async () => {
      await closePostgresPool();
      console.log('[AgroPulse] Server terminated cleanly.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (!isVercel) {
  startLocalServer().catch(err => {
    console.error('[AgroPulse] Server failed to start:', err);
    process.exit(1);
  });
}
