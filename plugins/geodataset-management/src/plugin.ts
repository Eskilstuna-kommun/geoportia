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

export const GeoDatasetListPage = geodatasetManagementPlugin.provide(
  createRoutableExtension({
    name: 'GeoDatasetListPage',
    component: () =>
      import('./components/DatasetListPage').then(m => m.DatasetListPage),
    mountPoint: rootRouteRef,
  }),
);
