import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { ArcGISSDEDataProvider } from './ArcGISSDEDataProvider';
import { ArcGISSDEClient } from './ArcGISSDEClient';
import { ArcGISSDEEntitiesProcessor } from './ArcGISSDEEntitiesProcessor';
import { arcGISSDEProviderRegistry } from './providerRegistry';

export const catalogModuleArcGISData = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'arcGIS-SDE-data',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        catalog: catalogProcessingExtensionPoint,
        scheduler: coreServices.scheduler,
        rootConfig: coreServices.rootConfig,
      },
      async init({ catalog, scheduler, rootConfig, logger }) {
        const providersConfig = rootConfig.getOptionalConfig(
          'catalog.providers.arcgissde',
        );
        if (!providersConfig) {
          logger.info(
            'No catalog.providers.arcgissde configuration found, skipping ArcGIS SDE data provider.',
          );
          return;
        }

        catalog.addProcessor(new ArcGISSDEEntitiesProcessor());

        for (const databaseName of providersConfig.keys()) {
          const dbConfig = providersConfig.getConfig(databaseName);
          const arcGISUri = dbConfig.getString('proxyUri');
          const arcGISSDEDatabase = dbConfig.getString('database');
          const arcGISSDEAdminUser = dbConfig.getString('adminUser');
          const arcGISSDEAdminPassword = dbConfig.getString('adminPassword');

          const taskRunner = scheduler.createScheduledTaskRunner({
            frequency: { minutes: 5 },
            timeout: { minutes: 5 },
          });

          logger.info(
            `Registering ArcGIS SDE data provider for database resource "${databaseName}".`,
          );

          const arcGISSDEClient = new ArcGISSDEClient(
            arcGISUri,
            arcGISSDEAdminUser,
            arcGISSDEAdminPassword,
            arcGISSDEDatabase,
          );

          const provider = new ArcGISSDEDataProvider(
            arcGISUri,
            taskRunner,
            logger,
            arcGISSDEClient,
            databaseName,
          );
          catalog.addEntityProvider(provider);

          // Register provider so it can be refreshed manually
          arcGISSDEProviderRegistry.register(databaseName, provider);
        }
      },
    });
  },
});
