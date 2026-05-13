import { MetadataApi, MetadataClient, MetadataEntry } from '@internal/geoportia-metadata-common';
import { createApiRef, DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';

export interface ExtendedMetadataApi extends MetadataApi {
  getMetadataEntry(entityRef: string): Promise<MetadataEntry | null>;
}

export class ExtendedMetadataClient extends MetadataClient implements ExtendedMetadataApi {
  private readonly _discoveryApi: DiscoveryApi;
  private readonly _fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    super(options);
    this._discoveryApi = options.discoveryApi;
    this._fetchApi = options.fetchApi;
  }

  async getMetadataEntry(entityRef: string): Promise<MetadataEntry | null> {
    const baseUrl = await this._discoveryApi.getBaseUrl('geoportia-metadata');
    const encodedRef = encodeURIComponent(entityRef);
    const response = await this._fetchApi.fetch(`${baseUrl}/${encodedRef}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    return response.json();
  }
}

export const metadataApiRef = createApiRef<ExtendedMetadataApi>({
  id: 'plugin.geoportia-metadata.service',
});
