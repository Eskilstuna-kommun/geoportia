/**
 * React hooks for metadata utilities with translation support.
 */

import { useMemo } from 'react';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../translation';
import {
  PLACEHOLDER_TRANSLATION_KEYS,
} from './metadataFieldMappings';
import { buildPlaceholderSet } from './metadataUtils';

export const usePlaceholderValues = (): Set<string> => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);

  return useMemo(() => {
    const translatedValues = PLACEHOLDER_TRANSLATION_KEYS.map(key => {
      try {
        return t(key as never);
      } catch {
        return '';
      }
    }).filter(Boolean);

    return buildPlaceholderSet(translatedValues);
  }, [t]);
};

export const useMetadataUtils = () => {
  const placeholders = usePlaceholderValues();

  return useMemo(
    () => ({
      placeholders,
      cleanString: (val: unknown): string | undefined => {
        if (typeof val !== 'string') return undefined;
        const trimmed = val.trim();
        if (placeholders.has(trimmed)) return undefined;
        return trimmed || undefined;
      },
    }),
    [placeholders],
  );
};
