import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import { createCreatePostgreSQLViewAction } from './actions/createPostgreSQLViewAction';

export const scaffolderModulePostgreSQL = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'geoportia-postgresql-actions',
  register(env) {
    env.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        rootConfig: coreServices.rootConfig,
      },
      async init({ scaffolder, rootConfig }) {
        const postgresUri = rootConfig.getString(
          'catalog.providers.postgresql.uri',
        );

        scaffolder.addActions(
          createCreatePostgreSQLViewAction({
            connectionString: postgresUri,
          }),
        );
      },
    });
  },
});
