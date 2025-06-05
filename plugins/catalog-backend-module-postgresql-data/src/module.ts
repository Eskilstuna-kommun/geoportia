import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { PostgreSQLDataProvider } from './PostgreSQLDataProvider';
import { PostgreSQLEntitiesProcessor } from './PostgreSQLEntitiesProcessor';
import { PostgresNotificationService } from './PostgresNotificationService';

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
        const postgresUri = rootConfig.getString('catalog.providers.postgresql.uri');
        const provider = new PostgreSQLDataProvider(
          postgresUri,
          taskRunner,
        );
        catalog.addEntityProvider(provider);
        catalog.addProcessor(new PostgreSQLEntitiesProcessor());

        // Performs a full refresh from the PostgreSQL database
        const updateFunction = async () => {
          try {
            await provider.run();
          } catch (error) {
            console.error('Error running PostgreSQL data provider:', error);
          }
        }

        const notificationService = new PostgresNotificationService(postgresUri, updateFunction);
        notificationService.start();
      },
    });
  },
});
