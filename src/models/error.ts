/**
 * Error Response Model
 *
 * This module defines the standardized error response format and error codes
 * for the GLB Optimizer Server API.
 *
 * All API errors follow a consistent structure to make error handling
 * predictable for API consumers.
 *
 * @module models/error
 * @see Requirements 9.3-9.5
 */

/**
 * Error codes used throughout the GLB Optimizer Server.
 *
 * These codes provide machine-readable error identification for API consumers.
 *
 * @see Requirements 9.3 - Missing parameters (INVALID_OPTIONS)
 * @see Requirements 9.4 - Resource not found (TASK_NOT_FOUND)
 * @see Requirements 9.5 - Internal server error (INTERNAL_ERROR)
 */
export const ERROR_CODES = {
  /**
   * The uploaded file is invalid (wrong format, corrupted, etc.).
   * HTTP Status: 400
   */
  INVALID_FILE: 'INVALID_FILE',

  /**
   * The uploaded file exceeds the maximum size limit (100MB).
   * HTTP Status: 413
   */
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',

  /**
   * The optimization options are invalid or missing required parameters.
   * HTTP Status: 400
   *
   * @see Requirements 9.3
   */
  INVALID_OPTIONS: 'INVALID_OPTIONS',

  /**
   * The optimization process failed during execution.
   * HTTP Status: 500
   */
  OPTIMIZATION_FAILED: 'OPTIMIZATION_FAILED',

  /**
   * The requested task ID does not exist.
   * HTTP Status: 404
   *
   * @see Requirements 9.4
   */
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',

  /**
   * An unexpected internal server error occurred.
   * HTTP Status: 500
   *
   * @see Requirements 9.5
   */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * Type representing valid error codes.
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Detailed error information included in error responses.
 */
export interface ErrorDetail {
  /**
   * Machine-readable error code.
   */
  code: string;

  /**
   * Human-readable error message.
   */
  message: string;

  /**
   * Optional additional details about the error.
   * May include information like:
   * - step: The optimization step that failed
   * - field: The invalid parameter field
   * - expected: The expected value/format
   * - received: The actual value received
   */
  details?: Record<string, unknown>;
}

/**
 * Standardized error response format for the API.
 *
 * All error responses follow this structure to ensure consistency
 * and predictability for API consumers.
 *
 * @see Requirements 9.2 - JSON format responses
 */
export interface ErrorResponse {
  /**
   * Always false for error responses.
   */
  success: false;

  /**
   * Error information.
   */
  error: ErrorDetail;
}

/**
 * HTTP status codes mapped to error codes.
 */
export const ERROR_HTTP_STATUS: Record<ErrorCode, number> = {
  [ERROR_CODES.INVALID_FILE]: 400,
  [ERROR_CODES.FILE_TOO_LARGE]: 413,
  [ERROR_CODES.INVALID_OPTIONS]: 400,
  [ERROR_CODES.OPTIMIZATION_FAILED]: 500,
  [ERROR_CODES.TASK_NOT_FOUND]: 404,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
};

/**
 * Default error messages for each error code.
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ERROR_CODES.INVALID_FILE]: 'The uploaded file is invalid or corrupted',
  [ERROR_CODES.FILE_TOO_LARGE]: 'The uploaded file exceeds the maximum size limit of 100MB',
  [ERROR_CODES.INVALID_OPTIONS]: 'The optimization options are invalid or missing required parameters',
  [ERROR_CODES.OPTIMIZATION_FAILED]: 'The optimization process failed',
  [ERROR_CODES.TASK_NOT_FOUND]: 'The requested task was not found',
  [ERROR_CODES.INTERNAL_ERROR]: 'An unexpected internal server error occurred',
};

/**
 * Helper function to create an ErrorResponse.
 *
 * @param code - Error code from ERROR_CODES
 * @param message - Optional custom error message (uses default if not provided)
 * @param details - Optional additional error details
 * @returns A properly formatted ErrorResponse
 */
export function createErrorResponse(
  code: ErrorCode,
  message?: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message: message || ERROR_MESSAGES[code],
      ...(details && { details }),
    },
  };
}

/**
 * Helper function to create an invalid file error response.
 *
 * @param message - Optional custom error message
 * @param details - Optional additional error details
 * @returns ErrorResponse for invalid file
 */
export function createInvalidFileError(
  message?: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return createErrorResponse(ERROR_CODES.INVALID_FILE, message, details);
}

/**
 * Helper function to create a file too large error response.
 *
 * @param fileSize - The actual file size in bytes
 * @param maxSize - The maximum allowed size in bytes
 * @returns ErrorResponse for file too large
 */
export function createFileTooLargeError(
  fileSize: number,
  maxSize: number
): ErrorResponse {
  return createErrorResponse(
    ERROR_CODES.FILE_TOO_LARGE,
    `File size ${fileSize} bytes exceeds maximum allowed size of ${maxSize} bytes`,
    { fileSize, maxSize }
  );
}

/**
 * Helper function to create an invalid options error response.
 *
 * @param message - Optional custom error message
 * @param details - Optional additional error details (e.g., invalid field)
 * @returns ErrorResponse for invalid options
 */
export function createInvalidOptionsError(
  message?: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return createErrorResponse(ERROR_CODES.INVALID_OPTIONS, message, details);
}

/**
 * Helper function to create an optimization failed error response.
 *
 * @param message - Optional custom error message
 * @param step - Optional step name where the failure occurred
 * @returns ErrorResponse for optimization failure
 */
export function createOptimizationFailedError(
  message?: string,
  step?: string
): ErrorResponse {
  return createErrorResponse(
    ERROR_CODES.OPTIMIZATION_FAILED,
    message,
    step ? { step } : undefined
  );
}

/**
 * Helper function to create a task not found error response.
 *
 * @param taskId - The task ID that was not found
 * @returns ErrorResponse for task not found
 */
export function createTaskNotFoundError(taskId: string): ErrorResponse {
  return createErrorResponse(
    ERROR_CODES.TASK_NOT_FOUND,
    `Task with ID '${taskId}' was not found`,
    { taskId }
  );
}

/**
 * Helper function to create an internal error response.
 *
 * @param message - Optional custom error message
 * @returns ErrorResponse for internal error
 */
export function createInternalError(message?: string): ErrorResponse {
  return createErrorResponse(ERROR_CODES.INTERNAL_ERROR, message);
}

/**
 * Get the HTTP status code for an error code.
 *
 * @param code - Error code from ERROR_CODES
 * @returns HTTP status code
 */
export function getHttpStatusForError(code: ErrorCode): number {
  return ERROR_HTTP_STATUS[code] || 500;
}

/**
 * Type guard to check if a response is an ErrorResponse.
 *
 * @param response - Response object to check
 * @returns True if the response is an ErrorResponse
 */
export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    (response as ErrorResponse).success === false &&
    'error' in response &&
    typeof (response as ErrorResponse).error === 'object'
  );
}

/**
 * Custom error class for optimization-related errors.
 *
 * This class extends the standard Error class to include
 * error codes and additional details for API error responses.
 */
export class OptimizationError extends Error {
  /**
   * Error code from ERROR_CODES.
   */
  public readonly code: ErrorCode;

  /**
   * Optional additional error details.
   */
  public readonly details?: Record<string, unknown>;

  /**
   * Creates a new OptimizationError.
   *
   * @param code - Error code from ERROR_CODES
   * @param message - Error message
   * @param details - Optional additional error details
   */
  constructor(
    code: ErrorCode,
    message?: string,
    details?: Record<string, unknown>
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.name = 'OptimizationError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OptimizationError);
    }
  }

  /**
   * Converts the error to an ErrorResponse object.
   *
   * @returns ErrorResponse representation of this error
   */
  toResponse(): ErrorResponse {
    return createErrorResponse(this.code, this.message, this.details);
  }

  /**
   * Gets the HTTP status code for this error.
   *
   * @returns HTTP status code
   */
  getHttpStatus(): number {
    return getHttpStatusForError(this.code);
  }
}
