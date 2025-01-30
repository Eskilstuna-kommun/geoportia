import {
  coreServices,
  createBackendPlugin,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { MetadataService } from './services/MetadataService/MetadataService';

/**
 * geoportiaMetadataBackendPlugin backend plugin
 *
 * @public
 */
export const geoportiaMetadataBackendPlugin = createBackendPlugin({
  pluginId: 'geoportia-metadata',
  register(env) {
    env.registerInit({
      deps: {
        auth: coreServices.auth,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        database: coreServices.database,
      },
      async init({ httpAuth, httpRouter, database }) {
        const client = await database.getClient();
        if (!database.migrations?.skip) {
          await client.migrate.latest({
            directory: resolvePackagePath(
              '@internal/backstage-plugin-geoportia-metadata-backend',
              'migrations',
            ),
          });
        }
        const metadata = new MetadataService(client);
        httpRouter.use(
          await createRouter({
            httpAuth,
            metadataService: metadata,
          }),
        );
      },
    });
  },
});
