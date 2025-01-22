import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { PostgreSQLDataProvider } from './PostgreSQLDataProvider';
import { PostgreSQLEntitiesProcessor } from './PostgreSQLEntitiesProcessor';

export const catalogModulePostgresqlData = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'postgresql-data',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        catalog: catalogProcessingExtensionPoint,
        scheduler: coreServices.scheduler,
        rootConfig: coreServices.rootConfig,
      },
      async init({ catalog, scheduler, rootConfig }) {
        const taskRunner = scheduler.createScheduledTaskRunner({
          frequency: { minutes: 5 },
          timeout: { minutes: 5 },
        });
        const provider = new PostgreSQLDataProvider(
          rootConfig.getString('catalog.providers.postgresql.uri'),
          taskRunner,
        );
        catalog.addEntityProvider(provider);
        catalog.addProcessor(new PostgreSQLEntitiesProcessor());
      },
    });
  },
});
