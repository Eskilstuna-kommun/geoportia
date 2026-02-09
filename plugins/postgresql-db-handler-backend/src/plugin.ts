import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { PostgreSQLDatabaseService } from './services/PostgreSQLDatabaseService';

/**
 * postgresqlDbHandlerPlugin backend plugin
 *
 * @public
 */
export const postgresqlDbHandlerPlugin = createBackendPlugin({
  pluginId: 'postgresql-db-handler',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        catalog: catalogServiceRef,
        rootConfig: coreServices.rootConfig,
      },
      async init({ logger, httpAuth, httpRouter, catalog, rootConfig }) {
        const postgresUser = rootConfig.getString(
          'catalog.providers.postgresql.user',
        );
        const postgresPassword = rootConfig.getString(
          'catalog.providers.postgresql.password',
        );
        const postgresDatabase = rootConfig.getString(
          'catalog.providers.postgresql.database',
        );
        const postgresPort = Number(rootConfig.getString(
          'catalog.providers.postgresql.port',
        ));
        const postgresUrl = rootConfig.getString(
          'catalog.providers.postgresql.url',
        );

        const dbService = new PostgreSQLDatabaseService(
          postgresUrl,
          postgresPort,
          postgresDatabase,
          postgresUser,
          postgresPassword,
          logger,
        );

        httpRouter.use(
          await createRouter({
            httpAuth,
            dbService,
          }),
        );
      },
    });
  },
});
