/**
 * File Validator
 * 
 * This module provides GLB file validation functionality.
 * It validates file format, size, and structure according to the glTF 2.0 specification.
 * 
 * @module utils/file-validator
 */

/**
 * File validation result interface
 */
export interface FileValidation {
  /** Whether the file is valid */
  isValid: boolean;
  /** File size in bytes */
  fileSize: number;
  /** Detected MIME type */
  mimeType: string;
  /** List of validation errors */
  errors: string[];
}

/**
 * File constraints for GLB uploads
 * 
 * Requirements: 1.5 - Support maximum 100MB GLB file upload
 */
export const FILE_CONSTRAINTS = {
  /** Maximum file size in bytes (100MB) */
  maxSize: 100 * 1024 * 1024,
  /** Allowed MIME types for GLB files */
  allowedMimeTypes: ['model/gltf-binary'],
  /** Allowed file extensions */
  allowedExtensions: ['.glb'],
} as const;

/**
 * GLB file header constants
 * GLB files start with a 12-byte header:
 * - Bytes 0-3: Magic number 0x46546C67 ('glTF' in ASCII)
 * - Bytes 4-7: Version (should be 2 for glTF 2.0)
 * - Bytes 8-11: Total file length
 */
const GLB_HEADER = {
  /** GLB magic number: 'glTF' in little-endian (0x46546C67) */
  MAGIC: 0x46546C67,
  /** Expected glTF version */
  VERSION: 2,
  /** Minimum header size in bytes */
  HEADER_SIZE: 12,
} as const;

/**
 * Validates a GLB file buffer
 * 
 * Performs the following validations:
 * 1. File size check against 100MB limit (Requirement 1.3, 1.5)
 * 2. GLB magic number validation (Requirement 1.2)
 * 3. glTF version validation (Requirement 1.2)
 * 4. File length consistency check
 * 
 * @param buffer - The file buffer to validate
 * @param filename - Optional filename for extension validation
 * @returns FileValidation result with validation status and any errors
 */
export function validateGlbBuffer(buffer: Buffer, filename?: string): FileValidation {
  const errors: string[] = [];
  const fileSize = buffer.length;
  let mimeType = 'application/octet-stream';

  // Check file size against limit (Requirement 1.3, 1.5)
  if (fileSize > FILE_CONSTRAINTS.maxSize) {
    errors.push(
      `File size (${formatBytes(fileSize)}) exceeds maximum allowed size (${formatBytes(FILE_CONSTRAINTS.maxSize)})`
    );
  }

  // Check minimum size for GLB header
  if (fileSize < GLB_HEADER.HEADER_SIZE) {
    errors.push(
      `File is too small to be a valid GLB file. Minimum size is ${GLB_HEADER.HEADER_SIZE} bytes, got ${fileSize} bytes`
    );
    return {
      isValid: false,
      fileSize,
      mimeType,
      errors,
    };
  }

  // Validate GLB magic number (first 4 bytes should be 'glTF')
  const magic = buffer.readUInt32LE(0);
  if (magic !== GLB_HEADER.MAGIC) {
    const magicHex = magic.toString(16).padStart(8, '0');
    const expectedHex = GLB_HEADER.MAGIC.toString(16).padStart(8, '0');
    errors.push(
      `Invalid GLB magic number. Expected 0x${expectedHex} ('glTF'), got 0x${magicHex}`
    );
  } else {
    // Only set MIME type if magic number is valid
    mimeType = 'model/gltf-binary';
  }

  // Validate glTF version (bytes 4-7 should be 2)
  const version = buffer.readUInt32LE(4);
  if (version !== GLB_HEADER.VERSION) {
    errors.push(
      `Unsupported glTF version. Expected version ${GLB_HEADER.VERSION}, got version ${version}`
    );
  }

  // Validate file length consistency (bytes 8-11 should match actual file size)
  const declaredLength = buffer.readUInt32LE(8);
  if (declaredLength !== fileSize) {
    errors.push(
      `File length mismatch. Header declares ${declaredLength} bytes, but file is ${fileSize} bytes`
    );
  }

  // Validate file extension if filename is provided
  if (filename) {
    const extension = getFileExtension(filename).toLowerCase();
    if (!(FILE_CONSTRAINTS.allowedExtensions as readonly string[]).includes(extension)) {
      errors.push(
        `Invalid file extension '${extension}'. Allowed extensions: ${FILE_CONSTRAINTS.allowedExtensions.join(', ')}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    fileSize,
    mimeType,
    errors,
  };
}

/**
 * Validates file extension
 * 
 * @param filename - The filename to validate
 * @returns true if the extension is valid (.glb)
 */
export function validateFileExtension(filename: string): boolean {
  const extension = getFileExtension(filename).toLowerCase();
  return (FILE_CONSTRAINTS.allowedExtensions as readonly string[]).includes(extension);
}

/**
 * Validates file size against the maximum limit
 * 
 * @param size - File size in bytes
 * @returns true if the size is within the limit
 */
export function validateFileSize(size: number): boolean {
  return size > 0 && size <= FILE_CONSTRAINTS.maxSize;
}

/**
 * Extracts the file extension from a filename
 * 
 * @param filename - The filename to extract extension from
 * @returns The file extension including the dot (e.g., '.glb')
 */
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }
  return filename.substring(lastDotIndex);
}

/**
 * Formats bytes into a human-readable string
 * 
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., '10.5 MB')
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
