/**
 * Status Route
 *
 * Handles task status query requests.
 * Implements GET /api/status/:taskId endpoint.
 *
 * @module routes/status
 */

import { Router, Request, Response, NextFunction } from 'express';
import { resultFileExists, uploadedFileExists } from '../utils/storage';
import { OptimizationError, ERROR_CODES } from '../models/error';
import { Task, TaskStatus } from '../models/task';

const router = Router();

// In-memory task store (for MVP - could be replaced with Redis/DB)
const taskStore = new Map<string, Task>();

/**
 * Store a task in the task store.
 * @param task - The task to store
 */
export function storeTask(task: Task): void {
  taskStore.set(task.id, task);
}

/**
 * Get a task from the task store.
 * @param taskId - The task ID
 * @returns The task or undefined
 */
export function getTask(taskId: string): Task | undefined {
  return taskStore.get(taskId);
}

/**
 * Update a task in the task store.
 * @param taskId - The task ID
 * @param updates - Partial task updates
 */
export function updateTask(taskId: string, updates: Partial<Task>): void {
  const task = taskStore.get(taskId);
  if (task) {
    taskStore.set(taskId, { ...task, ...updates });
  }
}

/**
 * @openapi
 * /api/status/{taskId}:
 *   get:
 *     summary: Get task status
 *     description: |
 *       Query the status of an optimization task.
 *       Returns the current status and result if completed.
 *     tags:
 *       - Status
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The task ID returned from the optimize endpoint
 *     responses:
 *       200:
 *         description: Task status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TaskStatus'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:taskId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { taskId } = req.params;

    // Validate taskId format (basic UUID check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(taskId)) {
      throw new OptimizationError(
        ERROR_CODES.TASK_NOT_FOUND,
        'Invalid task ID format',
        { taskId }
      );
    }

    // Check task store first
    const storedTask = taskStore.get(taskId);
    if (storedTask) {
      res.json({
        taskId: storedTask.id,
        status: storedTask.status,
        createdAt: storedTask.createdAt,
        completedAt: storedTask.completedAt,
        result: storedTask.result,
        error: storedTask.error,
      });
      return;
    }

    // Fallback: Check file system for task status
    const hasResult = await resultFileExists(taskId);
    const hasUpload = await uploadedFileExists(taskId);

    if (hasResult) {
      // Task completed successfully
      res.json({
        taskId,
        status: 'completed' as TaskStatus,
        message: 'Optimization completed. Use /api/download/:taskId to download the result.',
      });
    } else if (hasUpload) {
      // Task is pending or processing
      res.json({
        taskId,
        status: 'processing' as TaskStatus,
        message: 'Optimization in progress.',
      });
    } else {
      // Task not found
      throw new OptimizationError(
        ERROR_CODES.TASK_NOT_FOUND,
        'Task not found',
        { taskId }
      );
    }
  } catch (error) {
    next(error);
  }
});

export default router;
