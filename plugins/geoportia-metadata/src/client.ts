import { MetadataApi, MetadataClient } from '@internal/geoportia-metadata-common';
import { createApiRef } from '@backstage/core-plugin-api';

export { MetadataClient };
export type { MetadataApi };

export const metadataApiRef = createApiRef<MetadataApi>({
  id: 'plugin.geoportia-metadata.service',
});
