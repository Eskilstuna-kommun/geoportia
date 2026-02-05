import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { createRouter } from './PostgreSQLDatabaseRouter';

export const postgresqlModuleDbHandler = createBackendModule({
  pluginId: 'postgresql',
  moduleId: 'db-handler',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        catalog: catalogProcessingExtensionPoint,
        scheduler: coreServices.scheduler,
        rootConfig: coreServices.rootConfig,
      },
      async init({ catalog, scheduler, rootConfig, logger }) {
        const postgresUser = rootConfig.getString(
          'catalog.providers.postgresql.user',
        );
        const postgresPassword = rootConfig.getString(
          'catalog.providers.postgresql.password',
        );
        const postgresDatabase = rootConfig.getString(
          'catalog.providers.postgresql.database',
        );
        const postgresPort = rootConfig.getString(
          'catalog.providers.postgresql.port',
        );
        const postgresUrl = rootConfig.getString(
          'catalog.providers.postgresql.url',
        );

        const router = await createRouter(
          postgresUrl,
          Number(postgresPort),
          postgresDatabase,
          postgresUser,
          postgresPassword,
          logger,
        );

        // ToDo: Start the router
      },
    });
  },
});
