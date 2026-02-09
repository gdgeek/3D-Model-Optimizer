/**
 * API Authentication Middleware
 *
 * Optional API key authentication.
 * - If API_KEY env var is not set, all requests pass through
 * - If API_KEY is set, requests must include the key via header or query param
 */

import { Request, Response, NextFunction } from 'express';

export const getApiKey = (): string | undefined => process.env.API_KEY;

export const isAuthEnabled = (): boolean => {
  const key = getApiKey();
  return !!key && key.length > 0;
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!isAuthEnabled()) return next();

  const apiKey = getApiKey();

  // Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const [type, token] = authHeader.split(' ');
    if (type === 'Bearer' && token === apiKey) return next();
  }

  // x-api-key header
  if (req.headers['x-api-key'] === apiKey) return next();

  // query parameter
  if (req.query.api_key === apiKey) return next();

  res.status(401).json({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: 'API key required. Use Authorization: Bearer <key>, x-api-key header, or ?api_key= query param.',
    },
  });
};
