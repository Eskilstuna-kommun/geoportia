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
import { PreviewCardProps } from './components/PreviewCard';
import { MetadataClient } from '@internal/geoportia-metadata-common';
import { FC } from 'react';

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

export const EntityMetadataCard: FC<MetadataCardProps> =
  geoportiaMetadataPlugin.provide(
    createComponentExtension({
      name: 'EntityMetadataCard',
      component: {
        lazy: () =>
          import('./components/MetadataCard').then(m => m.MetadataCard),
      },
    }),
  );

export const EntityPreviewCard: FC<PreviewCardProps> =
  geoportiaMetadataPlugin.provide(
    createComponentExtension({
      name: 'EntityPreviewCard',
      component: {
        lazy: () => import('./components/PreviewCard').then(m => m.PreviewCard),
      },
    }),
  );
