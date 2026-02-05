/**
 * Configuration
 *
 * This module exports configuration settings for the GLB Optimizer Server.
 * Configuration includes:
 * - Server settings (port, host)
 * - File constraints (max size, allowed types)
 * - Timeout settings
 * - CORS configuration
 */

/**
 * Server configuration interface.
 */
export interface ServerConfig {
  /** Server port */
  port: number;
  /** Server host */
  host: string;
  /** CORS allowed origins */
  corsOrigins: string | string[];
  /** JSON body size limit */
  jsonLimit: string;
  /** File upload timeout (ms) */
  uploadTimeout: number;
  /** Single step optimization timeout (ms) */
  stepTimeout: number;
  /** Total processing timeout (ms) */
  totalTimeout: number;
  /** Maximum file size (bytes) */
  maxFileSize: number;
  /** Temporary files directory */
  tempDir: string;
  /** Result files directory */
  resultDir: string;
}

/**
 * Parse environment variable as number with default.
 * @param value - Environment variable value
 * @param defaultValue - Default value if not set or invalid
 * @returns Parsed number or default
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse CORS origins from environment variable.
 * @param value - Comma-separated origins or '*'
 * @returns Array of origins or '*'
 */
function parseCorsOrigins(value: string | undefined): string | string[] {
  if (!value || value === '*') return '*';
  return value.split(',').map((origin) => origin.trim());
}

/**
 * Server configuration loaded from environment variables.
 */
export const config: ServerConfig = {
  // Server settings
  port: parseNumber(process.env.PORT, 3000),
  host: process.env.HOST || 'localhost',

  // CORS settings
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),

  // Body parser settings
  jsonLimit: process.env.JSON_LIMIT || '1mb',

  // Timeout settings (in milliseconds)
  uploadTimeout: parseNumber(process.env.UPLOAD_TIMEOUT, 30 * 1000), // 30 seconds
  stepTimeout: parseNumber(process.env.STEP_TIMEOUT, 5 * 60 * 1000), // 5 minutes
  totalTimeout: parseNumber(process.env.TOTAL_TIMEOUT, 30 * 60 * 1000), // 30 minutes

  // File settings
  maxFileSize: parseNumber(process.env.MAX_FILE_SIZE, 100 * 1024 * 1024), // 100MB

  // Directory settings
  tempDir: process.env.TEMP_DIR || 'temp',
  resultDir: process.env.RESULT_DIR || 'results',
};

// Re-export swagger configuration
export { swaggerSpec, swaggerOptions } from './swagger';
