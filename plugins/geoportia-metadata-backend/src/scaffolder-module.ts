import {
  coreServices,
  createBackendModule,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import { createStoreMetadataAction } from './actions';
import { MetadataService } from './services/MetadataService/MetadataService';
import { CatalogClient } from '@backstage/catalog-client';

export const scaffolderModuleGeoportiaMetadata = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'geoportia-metadata-actions',
  register(env) {
    env.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        database: coreServices.database,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
      },
      async init({ scaffolder, database, discovery, auth }) {
        const client = await database.getClient();
        
        // Run migrations if needed (use separate table to avoid conflicts)
        if (!database.migrations?.skip) {
          await client.migrate.latest({
            directory: resolvePackagePath(
              '@internal/backstage-plugin-geoportia-metadata-backend',
              'migrations',
            ),
            tableName: 'geoportia_metadata_knex_migrations',
          });
        }

        const catalogClient = new CatalogClient({ discoveryApi: discovery });
        const metadataService = new MetadataService(client, catalogClient, auth);

        scaffolder.addActions(
          createStoreMetadataAction({
            metadataService,
            auth,
          }),
        );
      },
    });
  },
});

export default scaffolderModuleGeoportiaMetadata;
