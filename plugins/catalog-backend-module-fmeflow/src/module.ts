import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { FmeFlowEntityProvider } from './FmeFlowEntityProvider'; 
import { FmeFlowEntitiesProcessor } from './FmeFlowEntitiesProcessor';

export const catalogModuleFmeflow = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'fmeflow',
  register(reg) {
    reg.registerInit({
      deps: {
        logger: coreServices.logger,
        catalog: catalogProcessingExtensionPoint,
        scheduler: coreServices.scheduler,
        config: coreServices.rootConfig,
      },
      async init({ catalog, scheduler, config, logger}) {
        const taskRunner = scheduler.createScheduledTaskRunner({
          frequency: { minutes: 5 },
          timeout: { minutes: 5 },
        });

        const baseUrl = config.getString('catalog.providers.fmeflow.baseUrl');
        const token = config.getOptionalString('catalog.providers.fmeflow.token');

        const provider = new FmeFlowEntityProvider({
          logger,
          baseUrl,
          token,
          taskRunner,
        });

        catalog.addEntityProvider(provider);
        catalog.addProcessor(new FmeFlowEntitiesProcessor());
      },
    });
  },
});
