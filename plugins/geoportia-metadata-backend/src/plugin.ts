import {
  coreServices,
  createBackendPlugin,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { MetadataService } from './services/MetadataService/MetadataService';
import { SuggestionService } from './services/SuggestionService/SuggestionService';
import { CatalogClient } from '@backstage/catalog-client';
import { loadArcgisSdeDatabases } from './arcgisSde/arcgisSdeConfig';

export const geoportiaMetadataBackendPlugin = createBackendPlugin({
  pluginId: 'geoportia-metadata',
  register(env) {
    env.registerInit({
      deps: {
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        database: coreServices.database,
        discovery: coreServices.discovery,
        permissions: coreServices.permissions,
        rootConfig: coreServices.rootConfig,
      },
      async init({
        httpAuth,
        httpRouter,
        database,
        auth,
        discovery,
        permissions,
        rootConfig,
      }) {
        const client = await database.getClient();
        if (!database.migrations?.skip) {
          await client.migrate.latest({
            directory: resolvePackagePath(
              '@internal/backstage-plugin-geoportia-metadata-backend',
              'migrations',
            ),
          });
        }

        const catalogClient = new CatalogClient({ discoveryApi: discovery });
        const metadata = new MetadataService(client, catalogClient, auth);
        const suggestion = new SuggestionService(client, catalogClient, auth);
        const arcgisSdeDatabases = loadArcgisSdeDatabases(rootConfig);

        httpRouter.use(
          await createRouter({
            httpAuth,
            metadataService: metadata,
            suggestionService: suggestion,
            permissions,
            arcgisSdeDatabases,
          }),
        );
      },
    });
  },
});
