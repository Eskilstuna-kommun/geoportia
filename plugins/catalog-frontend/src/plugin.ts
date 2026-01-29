import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const catalogFrontendPlugin = createPlugin({
  id: 'catalog-frontend',
  routes: {
    root: rootRouteRef,
  },
});

export const CatalogFrontendPage = catalogFrontendPlugin.provide(
  createRoutableExtension({
    name: 'CatalogFrontendPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
