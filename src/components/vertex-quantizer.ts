/**
 * Vertex Quantizer Component
 *
 * Reduces vertex data precision using gltf-transform quantize() function.
 * Supports selective quantization of Position, Normal, UV/TexCoord, and Color attributes.
 *
 * @module components/vertex-quantizer
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { Document, Accessor } from '@gltf-transform/core';
import { quantize } from '@gltf-transform/functions';
import { QuantizeOptions, DEFAULT_QUANTIZE_OPTIONS } from '../models/options';
import { QuantizeStats } from '../models/result';

/**
 * Vertex Quantizer interface for reducing vertex data precision in GLB models.
 */
export interface VertexQuantizer {
  /**
   * Quantize vertex attributes in a gltf-transform Document.
   *
   * @param document - The gltf-transform Document to process
   * @param options - Quantization options specifying which attributes to quantize
   * @returns Statistics about the quantization operation
   */
  quantize(document: Document, options?: QuantizeOptions): Promise<QuantizeStats>;
}

/**
 * Attribute type patterns for identifying accessor types.
 */
const ATTRIBUTE_PATTERNS = {
  POSITION: /^POSITION$/,
  NORMAL: /^NORMAL$/,
  TEXCOORD: /^TEXCOORD_\d+$/,
  COLOR: /^COLOR_\d+$/,
  TANGENT: /^TANGENT$/,
} as const;

/**
 * Calculate the total byte size of all accessors in a document.
 *
 * @param document - The gltf-transform Document
 * @returns Total size in bytes
 */
function calculateAccessorSize(document: Document): number {
  let totalSize = 0;

  for (const accessor of document.getRoot().listAccessors()) {
    const array = accessor.getArray();
    if (array) {
      totalSize += array.byteLength;
    }
  }

  return totalSize;
}

/**
 * Get the attribute type from an accessor by checking its usage in primitives.
 *
 * @param accessor - The accessor to check
 * @param document - The gltf-transform Document
 * @returns The attribute type (e.g., 'POSITION', 'NORMAL') or null if not found
 */
function getAccessorAttributeType(
  accessor: Accessor,
  document: Document
): string | null {
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      // Check all semantic attributes
      const semantics = primitive.listSemantics();
      for (const semantic of semantics) {
        const attr = primitive.getAttribute(semantic);
        if (attr === accessor) {
          return semantic;
        }
      }
    }
  }
  return null;
}

/**
 * Determine which attributes will be quantized based on options.
 *
 * @param document - The gltf-transform Document
 * @param options - Quantization options
 * @returns Array of attribute types that will be quantized
 */
function getAttributesToQuantize(
  document: Document,
  options: QuantizeOptions
): string[] {
  const attributeTypes = new Set<string>();

  for (const accessor of document.getRoot().listAccessors()) {
    const attrType = getAccessorAttributeType(accessor, document);
    if (!attrType) continue;

    // Check if this attribute type should be quantized based on options
    if (options.quantizePosition && ATTRIBUTE_PATTERNS.POSITION.test(attrType)) {
      attributeTypes.add('POSITION');
    }
    if (options.quantizeNormal && ATTRIBUTE_PATTERNS.NORMAL.test(attrType)) {
      attributeTypes.add('NORMAL');
    }
    if (options.quantizeTexcoord && ATTRIBUTE_PATTERNS.TEXCOORD.test(attrType)) {
      attributeTypes.add('TEXCOORD');
    }
    if (options.quantizeColor && ATTRIBUTE_PATTERNS.COLOR.test(attrType)) {
      attributeTypes.add('COLOR');
    }
    // Tangent is quantized along with normal in gltf-transform
    if (options.quantizeNormal && ATTRIBUTE_PATTERNS.TANGENT.test(attrType)) {
      attributeTypes.add('TANGENT');
    }
  }

  return Array.from(attributeTypes);
}

/**
 * Quantize vertex attributes in a GLB document.
 *
 * Uses gltf-transform's quantize() function to reduce vertex data precision.
 * This reduces file size while maintaining visual quality within acceptable tolerances.
 *
 * @param document - The gltf-transform Document to process
 * @param options - Quantization options (optional, defaults to quantizing all attributes)
 * @returns Statistics about the quantization operation including:
 *   - attributesQuantized: List of attribute types that were quantized
 *   - originalSize: Total accessor data size before quantization
 *   - quantizedSize: Total accessor data size after quantization
 *   - reductionRatio: Ratio of quantized to original size
 *
 * @example
 * ```typescript
 * import { Document } from '@gltf-transform/core';
 * import { quantizeVertices } from './vertex-quantizer';
 *
 * const document = new Document();
 * // ... load or create document ...
 *
 * const stats = await quantizeVertices(document, {
 *   enabled: true,
 *   quantizePosition: true,
 *   quantizeNormal: true,
 *   quantizeTexcoord: true,
 *   quantizeColor: false,  // Skip color quantization
 * });
 *
 * console.log(`Attributes quantized: ${stats.attributesQuantized.join(', ')}`);
 * console.log(`Original size: ${stats.originalSize} bytes`);
 * console.log(`Quantized size: ${stats.quantizedSize} bytes`);
 * console.log(`Reduction ratio: ${stats.reductionRatio}`);
 * ```
 *
 * @see Requirements 5.1 - Use gltf-transform quantize for quantization
 * @see Requirements 5.2 - Support Position quantization
 * @see Requirements 5.3 - Support Normal quantization
 * @see Requirements 5.4 - Support UV/TexCoord quantization
 * @see Requirements 5.5 - Support Tangent quantization
 * @see Requirements 5.6 - Support selective quantization based on options
 * @see Requirements 5.7 - Return quantization statistics
 */
export async function quantizeVertices(
  document: Document,
  options?: QuantizeOptions
): Promise<QuantizeStats> {
  // Merge with default options
  const mergedOptions: QuantizeOptions = {
    enabled: true,
    ...DEFAULT_QUANTIZE_OPTIONS,
    ...options,
  };

  // If quantization is disabled, return zero stats
  if (!mergedOptions.enabled) {
    return {
      attributesQuantized: [],
      originalSize: 0,
      quantizedSize: 0,
      reductionRatio: 1,
    };
  }

  // Calculate original size before quantization
  const originalSize = calculateAccessorSize(document);

  // Determine which attributes will be quantized
  const attributesToQuantize = getAttributesToQuantize(document, mergedOptions);

  // If no attributes to quantize, return early
  if (attributesToQuantize.length === 0) {
    return {
      attributesQuantized: [],
      originalSize,
      quantizedSize: originalSize,
      reductionRatio: 1,
    };
  }

  // Build quantize options based on QuantizeOptions
  // The quantize() function uses pattern matching for attribute selection
  const quantizeConfig: Parameters<typeof quantize>[0] = {};

  // Configure which attributes to quantize
  // gltf-transform quantize uses pattern matching, so we need to set patterns
  // for attributes we DON'T want to quantize to exclude them
  if (!mergedOptions.quantizePosition) {
    quantizeConfig.quantizePosition = 0; // 0 bits = no quantization
  }
  if (!mergedOptions.quantizeNormal) {
    quantizeConfig.quantizeNormal = 0;
  }
  if (!mergedOptions.quantizeTexcoord) {
    quantizeConfig.quantizeTexcoord = 0;
  }
  if (!mergedOptions.quantizeColor) {
    quantizeConfig.quantizeColor = 0;
  }

  // Apply the quantize transform
  await document.transform(quantize(quantizeConfig));

  // Calculate quantized size after quantization
  const quantizedSize = calculateAccessorSize(document);

  // Calculate reduction ratio
  const reductionRatio = originalSize > 0 ? quantizedSize / originalSize : 1;

  // Return statistics
  const stats: QuantizeStats = {
    attributesQuantized: attributesToQuantize,
    originalSize,
    quantizedSize,
    reductionRatio,
  };

  return stats;
}

/**
 * Create a VertexQuantizer instance.
 *
 * @returns A VertexQuantizer instance
 */
export function createVertexQuantizer(): VertexQuantizer {
  return {
    quantize: quantizeVertices,
  };
}

/**
 * Default export for convenience.
 */
export default {
  quantizeVertices,
  createVertexQuantizer,
};
