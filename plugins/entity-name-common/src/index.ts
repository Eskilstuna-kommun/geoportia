import { createHash } from 'node:crypto';

export type EntityNameHashAlgorithm = 'md5';

export interface BackstageNameConversionOptions {
  /** Maximum length of the sanitized prefix (default: 58). */
  maxPrefixLength?: number;
  /** Number of hex characters taken from the hash (default: 4). */
  hashLength?: number;
  /** Separator inserted between prefix and hash (default: "-"). */
  separator?: string;
  /** Hash algorithm (currently only md5 is supported; default: "md5"). */
  algorithm?: EntityNameHashAlgorithm;
}

/**
 * Converts an arbitrary name to a Backstage-compliant, stable string.
 *
 * Algorithm (defaults):
 * - sanitize: keep [a-zA-Z0-9._-], replace other chars with '_'
 * - prefix: first 58 chars of the original string
 * - suffix: '-' + first 4 chars of md5 hex digest
 */
export function convertNameToBackstageCompliant(
  name: string,
  options?: BackstageNameConversionOptions,
): string {
  const normalizedName = `${name ?? ''}`;
  const {
    maxPrefixLength = 58,
    hashLength = 4,
    separator = '-',
    algorithm = 'md5',
  } = options ?? {};

  const shortHash = createHash(algorithm)
    .update(normalizedName, 'utf8')
    .digest('hex')
    .substring(0, hashLength);

  return (
    normalizedName.substring(0, maxPrefixLength).replace(/[^a-zA-Z0-9._-]/g, '_') +
    separator +
    shortHash
  );
}

  /**
 * Converts an arbitrary namespace name to a Backstage-compliant, stable string.
 *
 * Algorithm (defaults):
 * - sanitize: keep [a-zA-Z0-9._-], replace other chars with '_'
 * - prefix: first 58 chars of the original string
 * - suffix: '-' + first 4 chars of md5 hex digest
 */
  export function convertNamespaceToBackstageCompliant(
    name: string,
    options?: BackstageNameConversionOptions,
  ): string {
    const normalizedName = `${name ?? ''}`;
    const {
      maxPrefixLength = 58,
      hashLength = 4,
      separator = '-',
      algorithm = 'md5',
    } = options ?? {};

    const shortHash = createHash(algorithm)
      .update(normalizedName, 'utf8')
      .digest('hex')
      .substring(0, hashLength);

    return (
      normalizedName.substring(0, maxPrefixLength).replace(/[^a-z0-9-]/g, '') +
      separator +
      shortHash
    );
  }
