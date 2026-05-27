import { useApi } from '@backstage/core-plugin-api';
import { metadataApiRef } from '@internal/backstage-plugin-geoportia-metadata';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { ReviewItem } from '../data';

type AnyRecord = Record<string, unknown>;

const asRecord = (value: unknown): AnyRecord =>
  value && typeof value === 'object' ? (value as AnyRecord) : {};

const getString = (obj: unknown, key: string, fallback = ''): string => {
  const v = asRecord(obj)[key];
  return typeof v === 'string' ? v : fallback;
};

const getBoolean = (obj: unknown, key: string): boolean => {
  const v = asRecord(obj)[key];
  return typeof v === 'boolean' ? v : false;
};

type Suggestion = {
  id: number;
  entityRef: string;
  metadata?: AnyRecord | null;
  suggestedBy?: string | null;
};

function suggestionToReviewItem(s: Suggestion): ReviewItem {
  const md = asRecord(s.metadata);
  const layerInfo = md.layerInfo;
  const databaseInfo = md.databaseInfo;
  const meta = md.metadata;

  const title =
    getString(layerInfo, 'title') ||
    getString(layerInfo, 'layerName') ||
    s.entityRef;

  const summary =
    getString(layerInfo, 'summary') ||
    getString(layerInfo, 'suggestedTitle') ||
    s.entityRef;

  const historyParts: Array<[string, string]> = [
    ['', getString(meta, 'originHistory')],
    ['Källa', getString(meta, 'source')],
    ['Kvalitet', getString(meta, 'quality')],
    ['Datainsamlingsmetod', getString(meta, 'dataCollectionMethod')],
    ['Bearbetningssteg', getString(meta, 'processingMethod')],
  ];
  const history = historyParts
    .filter(([, value]) => Boolean(value))
    .map(([label, value]) => (label ? `${label}: ${value}` : value));

  return {
    id: String(s.id),
    title,
    summary,
    uuid:
      getString(meta, 'uuid') ||
      getString(layerInfo, 'uuid') ||
      String(s.id),
    dataType: getString(databaseInfo, 'dataType', '—'),
    owner: getString(layerInfo, 'suggestedOwnerEnhet', '—'),
    adminRoutine: getString(meta, 'administrationRoutine', '—'),
    maintenanceFrequency: getString(meta, 'maintenanceFrequency', '—'),
    history: history.length > 0 ? history : ['—'],
    protectionClass: getString(layerInfo, 'securityClass', '—'),
    openData: getBoolean(layerInfo, 'openData'),
    suggestedBy: s.suggestedBy ?? '',
  };
}

/**
 * Loads all metadata change suggestions the current user is allowed to see
 * from the `geoportia-metadata` backend and maps them to `ReviewItem`s.
 */
export function useReviewSuggestions() {
  const metadataApi = useApi(metadataApiRef);

  return useAsyncRetry(async () => {
    const response = await metadataApi.listAllSuggestions({});
    if (!response.ok) {
      throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
    }
    const data = await response.json();
    return data.map(suggestionToReviewItem);
  }, [metadataApi]);
}
