import {
  createApiFactory,
  createPlugin,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { metadataApiRef, MetadataClient } from './client';

export const geoportiaMetadataPlugin = createPlugin({
  id: 'geoportia-metadata',
  routes: {
    root: rootRouteRef,
  },
  apis: [
    createApiFactory({
      api: metadataApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new MetadataClient({ discoveryApi, fetchApi }),
    }),
  ],
});

export { MetadataEntryViewer } from './components/MetadataEntryViewer';
export type { MetadataEntryViewerProps } from './components/MetadataEntryViewer';

export { EntityMetadataEntryContent } from './components/EntityMetadataEntryContent';
export type { EntityMetadataEntryContentProps } from './components/EntityMetadataEntryContent';
