/**
 * Structured Logger
 *
 * JSON-format structured logging using pino.
 * Replaces console.log/console.error across the codebase.
 *
 * @module utils/logger
 */

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino/file', options: { destination: 1 } }
    : undefined,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
