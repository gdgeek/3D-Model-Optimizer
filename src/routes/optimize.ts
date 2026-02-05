/**
 * Optimize Route
 *
 * Handles 3D model file upload and optimization requests.
 * Supports multiple formats: GLB, GLTF, OBJ, STL, FBX, USDZ
 * Implements POST /api/optimize endpoint.
 *
 * @module routes/optimize
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { validateGlbBuffer, FILE_CONSTRAINTS } from '../utils/file-validator';
import { getResultFilePath } from '../utils/storage';
import { executePipeline } from '../components/optimization-pipeline';
import {
  convertToGLB,
  isSupportedFormat,
  getFileExtension,
  SUPPORTED_FORMATS,
} from '../components/format-converter';
import { OptimizationOptions } from '../models/options';
import { OptimizationError, ERROR_CODES } from '../models/error';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: FILE_CONSTRAINTS.maxSize,
  },
  fileFilter: (_req, file, cb) => {
    // Check file extension
    const ext = getFileExtension(file.originalname);
    if (!isSupportedFormat(ext)) {
      cb(
        new OptimizationError(ERROR_CODES.INVALID_FILE, `Unsupported file format: ${ext}`, {
          received: ext,
          expected: SUPPORTED_FORMATS.join(', '),
        })
      );
      return;
    }
    cb(null, true);
  },
});

/**
 * @openapi
 * /api/optimize:
 *   post:
 *     summary: Upload and optimize a 3D model file
 *     description: |
 *       Upload a 3D model file and apply various optimizations.
 *       Supported formats: GLB, GLTF, OBJ, STL, FBX, USDZ
 *       Non-GLB formats will be automatically converted to GLB before optimization.
 *       Supported optimizations include mesh simplification, Draco compression,
 *       texture compression (KTX2/Basis Universal), vertex quantization,
 *       mesh merging, and resource cleanup.
 *     tags:
 *       - Optimization
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 3D model file to optimize (max 100MB). Supported formats: GLB, GLTF, OBJ, STL
 *               options:
 *                 type: string
 *                 description: |
 *                   JSON string of optimization options.
 *                   Example: {"simplify":{"enabled":true,"targetRatio":0.5},"draco":{"enabled":true}}
 *     responses:
 *       200:
 *         description: Optimization successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OptimizationResult'
 *       400:
 *         description: Invalid file or options
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       413:
 *         description: File too large (exceeds 100MB limit)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Optimization failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/',
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        throw new OptimizationError(ERROR_CODES.INVALID_FILE, 'No file uploaded. Please provide a 3D model file.', {
          field: 'file',
        });
      }

      const fileBuffer = req.file.buffer;
      // Decode filename properly for UTF-8
      const originalFilename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      const ext = getFileExtension(originalFilename);

      // Generate task ID
      const taskId = uuidv4();

      // Create temp directory for this task
      const tempDir = path.join('./temp', taskId);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Save uploaded file with original extension
      const uploadedFilePath = path.join(tempDir, `input${ext}`);
      fs.writeFileSync(uploadedFilePath, fileBuffer);

      // Path for converted GLB (if needed)
      const convertedGlbPath = path.join(tempDir, 'converted.glb');

      let inputGlbPath: string;
      let conversionInfo: { converted: boolean; originalFormat: string; conversionTime?: number } = {
        converted: false,
        originalFormat: ext.toUpperCase().slice(1),
      };

      // Convert to GLB if needed
      if (ext !== '.glb') {
        const conversionResult = await convertToGLB(uploadedFilePath, convertedGlbPath, originalFilename);

        if (!conversionResult.success) {
          throw new OptimizationError(
            ERROR_CODES.INVALID_FILE,
            `Failed to convert ${ext} to GLB: ${conversionResult.error}`,
            { originalFormat: ext, error: conversionResult.error }
          );
        }

        inputGlbPath = convertedGlbPath;
        conversionInfo = {
          converted: true,
          originalFormat: conversionResult.originalFormat,
          conversionTime: conversionResult.conversionTime,
        };
      } else {
        // Validate GLB file format
        const validation = validateGlbBuffer(fileBuffer);
        if (!validation.isValid) {
          throw new OptimizationError(ERROR_CODES.INVALID_FILE, validation.errors.join('; '), {
            filename: originalFilename,
          });
        }
        inputGlbPath = uploadedFilePath;
      }

      // Parse optimization options
      let options: OptimizationOptions = {};
      if (req.body.options) {
        try {
          options = JSON.parse(req.body.options);
        } catch {
          throw new OptimizationError(ERROR_CODES.INVALID_OPTIONS, 'Invalid options JSON format', {
            field: 'options',
            received: req.body.options,
          });
        }
      }

      // Get output path for result file
      const outputPath = getResultFilePath(taskId);

      // Execute optimization pipeline
      const result = await executePipeline(inputGlbPath, outputPath, options);

      // Override taskId in result to match our generated one
      result.taskId = taskId;
      result.downloadUrl = `/api/download/${taskId}`;

      // Add conversion info to result
      const extendedResult = {
        ...result,
        conversion: conversionInfo,
      };

      // Return result
      res.json(extendedResult);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
