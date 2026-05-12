import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export const geodatasetManagementPlugin = createPlugin({
  id: 'geodataset-management',
  routes: {
    root: rootRouteRef,
  },
});

export const GeoDatasetManagementPage = geodatasetManagementPlugin.provide(
  createRoutableExtension({
    name: 'GeoDatasetManagementPage',
    component: () =>
      import('./components/MainGeoDatasetPage').then(m => m.MainGeoDatasetPage),
    mountPoint: rootRouteRef,
  }),
);
