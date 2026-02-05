/**
 * Utilities
 * 
 * This module exports utility functions for the GLB Optimizer Server.
 * Utilities include:
 * - FileValidator - GLB file validation
 * - Storage - File storage management
 */

// File Validator exports
export {
  validateGlbBuffer,
  validateFileExtension,
  validateFileSize,
  FILE_CONSTRAINTS,
  type FileValidation,
} from './file-validator';

// Storage exports
export {
  StorageManager,
  storage,
  saveUploadedFile,
  saveResultFile,
  getUploadedFile,
  getResultFile,
  deleteTaskFiles,
  cleanupOldFiles,
  type StorageConfig,
  type FileMetadata,
} from './storage';