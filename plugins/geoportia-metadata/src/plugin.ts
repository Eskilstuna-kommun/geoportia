import {
  createApiFactory,
  createComponentExtension,
  createPlugin,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';
import { MetadataCardProps } from './components/MetadataCard';
import { metadataApiRef } from './client';
import { DefaultApiClient } from './schema/openapi';

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
        new DefaultApiClient({ discoveryApi, fetchApi }),
    }),
  ],
});

export const EntityMetadataCard: (props: MetadataCardProps) => JSX.Element =
  geoportiaMetadataPlugin.provide(
    createComponentExtension({
      name: 'EntityMetadataCard',
      component: {
        lazy: () =>
          import('./components/MetadataCard').then(m => m.MetadataCard),
      },
    }),
  );
