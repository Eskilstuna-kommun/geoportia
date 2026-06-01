import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';

export type MetadataApiDeps = {
  discoveryApi: DiscoveryApi;
  fetchApi: FetchApi;
};

export type MetadataEntryDto = {
  entityRef: string;
  schema: unknown;
  metadata: Record<string, unknown>;
  deleted?: boolean;
};

const baseFor = (deps: MetadataApiDeps) =>
  deps.discoveryApi.getBaseUrl('geoportia-metadata');

/** GET /api/geoportia-metadata/:entityRef */
export const getMetadataEntry = async (
  deps: MetadataApiDeps,
  entityRef: string,
): Promise<MetadataEntryDto> => {
  const baseUrl = await baseFor(deps);
  const response = await deps.fetchApi.fetch(
    `${baseUrl}/${encodeURIComponent(entityRef)}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to load ${entityRef}: ${response.status}`);
  }
  return response.json();
};

/** PUT /api/geoportia-metadata/:entityRef — full schema + metadata update. */
export const updateMetadataEntry = async (
  deps: MetadataApiDeps,
  entityRef: string,
  body: { schema: unknown; metadata: Record<string, unknown> },
): Promise<void> => {
  const baseUrl = await baseFor(deps);
  const response = await deps.fetchApi.fetch(
    `${baseUrl}/${encodeURIComponent(entityRef)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    // Surface the backend's error message (e.g. schema validation details).
    let detail = '';
    try {
      const payload = await response.json();
      detail =
        (payload?.error?.message as string) ??
        (payload?.message as string) ??
        JSON.stringify(payload);
    } catch {
      try {
        detail = await response.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(
      `Failed to update ${entityRef} (${response.status}): ${detail}`,
    );
  }
};

/**
 * Toggle the soft-delete flag on a MetadataEntry. Hits
 * `PUT /api/geoportia-metadata/:entityRef/deleted`.
 */
export const setMetadataEntryDeleted = async (
  deps: MetadataApiDeps,
  entityRef: string,
  deleted: boolean,
): Promise<void> => {
  const baseUrl = await baseFor(deps);
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
