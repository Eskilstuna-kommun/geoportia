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
        const postgresUri = rootConfig.getString(
          'catalog.providers.postgresql.uri',
        );

        const dbService = new PostgreSQLDatabaseService(
          postgresUri,
          logger
        );

        httpRouter.use(
          await createRouter({
            httpAuth,
            catalog,
            dbService,
          }),
        );
      },
    });
  },
});
