import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { ArcGISSDEDataProvider } from './ArcGISSDEDataProvider';
import { ArcGISSDEClient } from './ArcGISSDEClient';
import { ArcGISSDEEntitiesProcessor } from './ArcGISSDEEntitiesProcessor';

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
        const taskRunner = scheduler.createScheduledTaskRunner({
          frequency: { minutes: 5 },
          timeout: { minutes: 5 },
        });
        const arcGISUri = rootConfig.getString(
          'catalog.providers.arcgissde.proxyUri',
        );
        const arcGISSDEDatabase = rootConfig.getString(
          'catalog.providers.arcgissde.database',
        );
        const arcGISSDEAdminUser = rootConfig.getString(
          'catalog.providers.arcgissde.adminUser',
        );
        const arcGISSDEAdminPassword = rootConfig.getString(
          'catalog.providers.arcgissde.adminPassword',
        );
        const arcGISSDEClient = new ArcGISSDEClient(arcGISUri, arcGISSDEAdminUser, arcGISSDEAdminPassword, arcGISSDEDatabase);

        const provider = new ArcGISSDEDataProvider(
          arcGISUri,
          taskRunner,
          logger,
          arcGISSDEClient,
        );
        catalog.addEntityProvider(provider);
        catalog.addProcessor(new ArcGISSDEEntitiesProcessor());
      },
    });
  },
});
