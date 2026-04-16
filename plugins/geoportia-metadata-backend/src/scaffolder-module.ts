import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import { CatalogClient } from '@backstage/catalog-client';
import { createStoreMetadataAction } from './actions';

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
        const dbClient = await database.getClient();
        const catalogApi = new CatalogClient({ discoveryApi: discovery });

        scaffolder.addActions(
          createStoreMetadataAction({
            database: dbClient,
            catalogApi,
            auth,
          }),
        );
      },
    });
  },
});

export default scaffolderModuleGeoportiaMetadata;
