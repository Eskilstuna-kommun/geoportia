import { useApi } from '@backstage/core-plugin-api';
import { metadataApiRef } from '@internal/backstage-plugin-geoportia-metadata';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import { ReviewItem } from '../data';

type AnyRecord = Record<string, unknown>;

const get = (obj: unknown, key: string): unknown =>
  obj && typeof obj === 'object' ? (obj as AnyRecord)[key] : undefined;

const getString = (obj: unknown, key: string, fallback = ''): string => {
  const v = get(obj, key);
  return typeof v === 'string' ? v : fallback;
};

const getBoolean = (obj: unknown, key: string): boolean => {
  const v = get(obj, key);
  return typeof v === 'boolean' ? v : false;
};

/**
 * Converts a metadata suggestion (as returned by the
 * `geoportia-metadata` backend) into the `ReviewItem` shape consumed by the
 * review dialog UI. Best-effort mapping that pulls common fields from
 * `layerInfo`, `databaseInfo` and `metadata` sections of the suggested
 * metadata payload.
 */
function suggestionToReviewItem(s: {
  id: number;
  entityRef: string;
  metadata: AnyRecord;
}): ReviewItem {
  const md = s.metadata ?? {};
  const layerInfo = get(md, 'layerInfo');
  const databaseInfo = get(md, 'databaseInfo');
  const meta = get(md, 'metadata');

  const title =
    getString(layerInfo, 'title') ||
    getString(layerInfo, 'layerName') ||
    s.entityRef;
  const summary =
    getString(layerInfo, 'summary') ||
    getString(layerInfo, 'suggestedTitle') ||
    s.entityRef;

  const history = [
    getString(meta, 'originHistory'),
    getString(meta, 'source') && `Källa: ${getString(meta, 'source')}`,
    getString(meta, 'quality') && `Kvalitet: ${getString(meta, 'quality')}`,
    getString(meta, 'dataCollectionMethod') &&
      `Datainsamlingsmetod: ${getString(meta, 'dataCollectionMethod')}`,
    getString(meta, 'processingMethod') &&
      `Bearbetningssteg: ${getString(meta, 'processingMethod')}`,
  ].filter((s2): s2 is string => Boolean(s2));

  return {
    id: String(s.id),
    title,
    summary,
    uuid: s.entityRef,
    dataType: getString(databaseInfo, 'dataType', '—'),
    owner: getString(layerInfo, 'suggestedOwnerEnhet', '—'),
    adminRoutine: getString(meta, 'administrationRoutine', '—'),
    maintenanceFrequency: getString(meta, 'maintenanceFrequency', '—'),
    history: history.length > 0 ? history : ['—'],
    protectionClass: getString(layerInfo, 'securityClass', '—'),
    openData: getBoolean(layerInfo, 'openData'),
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
    return data.map(s =>
      suggestionToReviewItem({
        id: s.id,
        entityRef: s.entityRef,
        metadata: (s.metadata ?? {}) as AnyRecord,
      }),
    );
  }, [metadataApi]);
}
