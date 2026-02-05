/**
 * 三维模型优化服务
 *
 * A Node.js server for optimizing GLB 3D model files with RESTful API.
 *
 * Core capabilities:
 * - Mesh simplification (meshoptimizer)
 * - Draco geometry compression
 * - Texture compression (KTX2/Basis Universal)
 * - Vertex quantization
 * - Mesh merging
 * - Resource cleanup
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { optimizeRouter, downloadRouter, statusRouter, analyzeRouter } from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import { config } from './config';

// Create Express application
const app: Express = express();

// CORS configuration
app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

// Middleware configuration
// - JSON body parser with size limit
app.use(express.json({ limit: config.jsonLimit }));
// - URL-encoded body parser
app.use(express.urlencoded({ extended: true, limit: config.jsonLimit }));
// - Static files for test UI
app.use(express.static(path.join(__dirname, '../public')));

// Swagger UI - API Documentation (Requirements: 9.1, 9.2)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: '三维模型优化服务 API',
}));

// OpenAPI JSON specification endpoint
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: '三维模型优化服务运行中',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/optimize', optimizeRouter);
app.use('/api/download', downloadRouter);
app.use('/api/status', statusRouter);
app.use('/api/analyze', analyzeRouter);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`三维模型优化服务运行在 http://${config.host}:${config.port}`);
    console.log(`API documentation available at http://${config.host}:${config.port}/api-docs`);
    console.log(`OpenAPI spec available at http://${config.host}:${config.port}/api-docs.json`);
  });
}

export default app;
