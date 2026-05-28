import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';

/**
 * Toggle the soft-delete flag on a MetadataEntry. Hits
 * `PUT /api/geoportia-metadata/:entityRef/deleted`.
 */
export const setMetadataEntryDeleted = async (
  deps: { discoveryApi: DiscoveryApi; fetchApi: FetchApi },
  entityRef: string,
  deleted: boolean,
): Promise<void> => {
  const baseUrl = await deps.discoveryApi.getBaseUrl('geoportia-metadata');
  const response = await deps.fetchApi.fetch(
    `${baseUrl}/${encodeURIComponent(entityRef)}/deleted`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deleted }),
    },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to ${deleted ? 'soft-delete' : 'restore'} ${entityRef}: ${
        response.status
      }`,
    );
  }
};
