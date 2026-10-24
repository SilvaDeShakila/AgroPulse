import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './src/server/api';
import { closePostgresPool } from './src/server/db/postgresPool';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON request body parser
  app.use(express.json());

  // Mount versioned REST API endpoints under /api/v1
  app.use('/api/v1', apiRouter);

  // Health check on root API
  app.get('/api', (req, res) => {
    res.json({
      message: 'AgroPulse Core API',
      documentation: '/api/v1/health',
      status: 'operational',
    });
  });

  // Mount Vite development middlewares
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AgroPulse Full-Stack] Server running on port ${PORT}`);
    console.log(`[AgroPulse API v1] Endpoints ready at http://localhost:${PORT}/api/v1`);
  });

  // Graceful shutdown handling
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

startServer().catch(err => {
  console.error('[AgroPulse] Server failed to start:', err);
  process.exit(1);
});
