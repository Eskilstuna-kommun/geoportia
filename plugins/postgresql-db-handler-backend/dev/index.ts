import { createBackend } from '@backstage/backend-defaults';
import { mockServices } from '@backstage/backend-test-utils';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';

// TEMPLATE NOTE:
// This is the development setup for your plugin that wires up a
// minimal backend that can use both real and mocked plugins and services.
//
// Start up the backend by running `yarn start` in the package directory.
// Once it's up and running, try out the following requests:
//
// List tables/views/columns (served from the Backstage Catalog):
//
//   curl http://localhost:7007/api/postgresql-db-handler/list-tables/public
//   curl http://localhost:7007/api/postgresql-db-handler/list-views/public
//   curl http://localhost:7007/api/postgresql-db-handler/list-columns/public/roads
//
// Explicitly make an unauthenticated request, or with service auth:
//
//   curl http://localhost:7007/api/postgresql-db-handler/list-tables/public -H 'Authorization: Bearer mock-none-token'
//   curl http://localhost:7007/api/postgresql-db-handler/list-tables/public -H 'Authorization: Bearer mock-service-token'

const backend = createBackend();

// TEMPLATE NOTE:
// Mocking the auth and httpAuth service allows you to call your plugin API without
// having to authenticate.
//
// If you want to use real auth, you can install the following instead:
//   backend.add(import('@backstage/plugin-auth-backend'));
//   backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
backend.add(mockServices.auth.factory());
backend.add(mockServices.httpAuth.factory());

// TEMPLATE NOTE:
// Rather than using a real catalog you can use a mock with a fixed set of entities.
backend.add(
  catalogServiceMock.factory({
    entities: [
      {
        apiVersion: 'geoportia.se/v1alpha1',
        kind: 'Table',
        metadata: { name: 'public.roads-aaaa', namespace: 'default' },
        spec: {
          schemaName: 'public',
          name: 'roads',
          columns: [{ name: 'id' }, { name: 'name' }],
        },
      },
      {
        apiVersion: 'geoportia.se/v1alpha1',
        kind: 'View',
        metadata: { name: 'public.roads_view-bbbb', namespace: 'default' },
        spec: {
          schemaName: 'public',
          name: 'roads_view',
          columns: [{ name: 'id' }, { name: 'name' }],
        },
      },
    ],
  }),
);

backend.add(import('../src'));

backend.start();
