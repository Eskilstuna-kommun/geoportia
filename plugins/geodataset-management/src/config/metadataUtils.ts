

import {
  DISPLAY_FIELD_PATHS,
  DisplayFieldKey,
  DEFAULT_PLACEHOLDER_VALUES,
} from './metadataFieldMappings';

type JsonObject = Record<string, unknown>;

/**
 * Build a Set of placeholder values.
 * Call this with translated placeholder strings to support i18n.
 */
export const buildPlaceholderSet = (
  additionalValues: string[] = [],
): Set<string> => {
  return new Set([...DEFAULT_PLACEHOLDER_VALUES, ...additionalValues]);
};

/**
 * Default placeholder set (for use outside React context).
 */
const defaultPlaceholders = buildPlaceholderSet();

/**
 * Get a value from an object using dot-notation path.
 * Returns undefined if path doesn't exist.
 */
export const getByPath = (obj: unknown, path: string): unknown => {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as JsonObject)[part];
  }
  return current;
};

/**
 * Try multiple paths in order, returning the first non-empty value found.
 */
export const getFirstValue = (obj: unknown, paths: readonly string[]): unknown => {
  for (const path of paths) {
    const val = getByPath(obj, path);
    if (val !== undefined && val !== null && val !== '') {
      return val;
    }
  }
  return undefined;
};

/**
 * Clean a string value: returns undefined if it's a placeholder.
 * @param val - The value to clean
 * @param placeholders - Optional set of placeholder values (uses default if not provided)
 */
export const cleanString = (
  val: unknown,
  placeholders: Set<string> = defaultPlaceholders,
): string | undefined => {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  if (placeholders.has(trimmed)) return undefined;
  return trimmed || undefined;
};

/**
 * Extract a display field from metadata using the configured path mappings.
 * Tries each fallback path until a value is found.
 */
export const getDisplayField = (
  metadata: unknown,
  field: DisplayFieldKey,
): unknown => {
  const paths = DISPLAY_FIELD_PATHS[field];
  return getFirstValue(metadata, paths);
};

/**
 * Extract a display field as a cleaned string.
 * @param placeholders - Optional set of placeholder values for i18n support
 */
export const getDisplayString = (
  metadata: unknown,
  field: DisplayFieldKey,
  placeholders?: Set<string>,
): string | undefined => {
  return cleanString(getDisplayField(metadata, field), placeholders);
};

/**
 * Extract a display field as a string array.
 * Handles both array values and single string values.
 * @param placeholders - Optional set of placeholder values for i18n support
 */
export const getDisplayStringArray = (
  metadata: unknown,
  field: DisplayFieldKey,
  placeholders: Set<string> = defaultPlaceholders,
): string[] | undefined => {
  const val = getDisplayField(metadata, field);
  if (Array.isArray(val)) {
    return val.filter((v): v is string => typeof v === 'string' && !placeholders.has(v));
  }
  const str = cleanString(val, placeholders);
  return str ? [str] : undefined;
};

/**
 * Extract a display field as a boolean.
 */
export const getDisplayBoolean = (
  metadata: unknown,
  field: DisplayFieldKey,
): boolean | undefined => {
  const val = getDisplayField(metadata, field);
  if (typeof val === 'boolean') return val;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return undefined;
};
