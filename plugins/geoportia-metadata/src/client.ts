import { MetadataApi } from '@internal/geoportia-metadata-common';
import { createApiRef } from '@backstage/core-plugin-api';

export const metadataApiRef = createApiRef<MetadataApi>({
  id: 'plugin.geoportia-metadata.service',
});
