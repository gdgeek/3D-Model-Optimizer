/**
 * Data Models
 *
 * This module exports all data models and interfaces for the GLB Optimizer Server.
 * Models include:
 * - OptimizationOptions - Configuration options for optimization
 * - OptimizationResult - Result of optimization operations
 * - Task - Task tracking model
 * - ErrorResponse - Standardized error response format
 */

// Optimization Options
export {
  SimplifyOptions,
  DracoOptions,
  TextureOptions,
  QuantizeOptions,
  MergeOptions,
  CleanOptions,
  OptimizationOptions,
  DEFAULT_SIMPLIFY_OPTIONS,
  DEFAULT_DRACO_OPTIONS,
  DEFAULT_TEXTURE_OPTIONS,
  DEFAULT_QUANTIZE_OPTIONS,
  DEFAULT_CLEAN_OPTIONS,
  SIMPLIFY_RATIO_RANGE,
  DRACO_COMPRESSION_LEVEL_RANGE,
  TEXTURE_MODES,
  TextureMode,
} from './options';

// Optimization Results and Statistics
export {
  OptimizationResult,
  OptimizationStepResult,
  SimplifyStats,
  DracoStats,
  TextureStats,
  TextureDetail,
  QuantizeStats,
  MergeStats,
  CleanStats,
  StepStats,
  StepStatsMap,
  OptimizationStep,
  OPTIMIZATION_STEPS,
  createSuccessStepResult,
  createFailedStepResult,
  createOptimizationResult,
} from './result';

// Task Model
export {
  Task,
  TaskStatus,
  createTask,
  markTaskProcessing,
  markTaskCompleted,
  markTaskFailed,
  isTaskFinished,
  isTaskSuccessful,
} from './task';

// Error Response Model
export {
  ERROR_CODES,
  ErrorCode,
  ErrorDetail,
  ErrorResponse,
  ERROR_HTTP_STATUS,
  ERROR_MESSAGES,
  createErrorResponse,
  createInvalidFileError,
  createFileTooLargeError,
  createInvalidOptionsError,
  createOptimizationFailedError,
  createTaskNotFoundError,
  createInternalError,
  getHttpStatusForError,
  isErrorResponse,
} from './error';
