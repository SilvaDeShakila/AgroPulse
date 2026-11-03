import express from 'express';
import { apiRouter } from './api.js';

const app = express();

app.use(express.json());

// Support both the original API prefix and Vercel's stripped function path.
app.use('/api/v1', apiRouter);
app.use('/v1', apiRouter);

app.get(['/api', '/'], (_req, res) => {
  res.json({
    message: 'AgroPulse Core API',
    documentation: '/api/v1/health',
    status: 'operational',
  });
});

export default app;