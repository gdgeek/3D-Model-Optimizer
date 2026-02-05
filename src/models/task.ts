/**
 * Task Model
 *
 * This module defines the Task interface and TaskStatus type for tracking
 * optimization jobs in the GLB Optimizer Server.
 *
 * Tasks represent individual optimization requests and track their lifecycle
 * from creation through completion or failure.
 *
 * @module models/task
 * @see Requirements 1.1, 9.3-9.5
 */

import { OptimizationOptions } from './options';
import { OptimizationResult } from './result';

/**
 * Status of an optimization task.
 *
 * - 'pending': Task has been created but not yet started
 * - 'processing': Task is currently being processed
 * - 'completed': Task has completed successfully
 * - 'failed': Task has failed with an error
 */
export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Represents an optimization task in the system.
 *
 * A task is created when a user uploads a GLB file for optimization.
 * It tracks the entire lifecycle of the optimization process including
 * input/output files, options, results, and any errors.
 *
 * @see Requirements 1.1 - Task identifier returned on file upload
 */
export interface Task {
  /**
   * Unique identifier for the task (UUID format).
   * Used to retrieve task status and download optimized files.
   *
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  id: string;

  /**
   * Current status of the task.
   */
  status: TaskStatus;

  /**
   * Timestamp when the task was created.
   */
  createdAt: Date;

  /**
   * Timestamp when the task completed (success or failure).
   * Only present when status is 'completed' or 'failed'.
   */
  completedAt?: Date;

  /**
   * Path to the input GLB file.
   * This is the original file uploaded by the user.
   */
  inputFile: string;

  /**
   * Path to the output GLB file.
   * Only present when optimization has completed successfully.
   */
  outputFile?: string;

  /**
   * Optimization options specified for this task.
   */
  options: OptimizationOptions;

  /**
   * Result of the optimization process.
   * Only present when status is 'completed'.
   */
  result?: OptimizationResult;

  /**
   * Error message if the task failed.
   * Only present when status is 'failed'.
   */
  error?: string;
}

/**
 * Helper function to create a new pending task.
 *
 * @param id - Unique task identifier (UUID)
 * @param inputFile - Path to the input GLB file
 * @param options - Optimization options for the task
 * @returns A new Task in 'pending' status
 */
export function createTask(
  id: string,
  inputFile: string,
  options: OptimizationOptions
): Task {
  return {
    id,
    status: 'pending',
    createdAt: new Date(),
    inputFile,
    options,
  };
}

/**
 * Helper function to mark a task as processing.
 *
 * @param task - The task to update
 * @returns Updated task with 'processing' status
 */
export function markTaskProcessing(task: Task): Task {
  return {
    ...task,
    status: 'processing',
  };
}

/**
 * Helper function to mark a task as completed.
 *
 * @param task - The task to update
 * @param outputFile - Path to the optimized output file
 * @param result - Optimization result with statistics
 * @returns Updated task with 'completed' status
 */
export function markTaskCompleted(
  task: Task,
  outputFile: string,
  result: OptimizationResult
): Task {
  return {
    ...task,
    status: 'completed',
    completedAt: new Date(),
    outputFile,
    result,
  };
}

/**
 * Helper function to mark a task as failed.
 *
 * @param task - The task to update
 * @param error - Error message describing the failure
 * @returns Updated task with 'failed' status
 */
export function markTaskFailed(task: Task, error: string): Task {
  return {
    ...task,
    status: 'failed',
    completedAt: new Date(),
    error,
  };
}

/**
 * Check if a task is in a terminal state (completed or failed).
 *
 * @param task - The task to check
 * @returns True if the task has finished processing
 */
export function isTaskFinished(task: Task): boolean {
  return task.status === 'completed' || task.status === 'failed';
}

/**
 * Check if a task completed successfully.
 *
 * @param task - The task to check
 * @returns True if the task completed without errors
 */
export function isTaskSuccessful(task: Task): boolean {
  return task.status === 'completed';
}
