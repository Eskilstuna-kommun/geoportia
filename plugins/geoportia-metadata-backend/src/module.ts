import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { MetadataEntryProvider } from './MetadataEntryProvider';
import { MetadataEntryProcessor } from './MetadataEntryProcessor';

const geoportiaMetadataBackendModule = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'geoportia-metadata-provider',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        database: coreServices.database,
        scheduler: coreServices.scheduler,
        logger: coreServices.logger,
      },
      async init({ catalog, database, scheduler, logger }) {
        const client = await database.getClient();

        const taskRunner = scheduler.createScheduledTaskRunner({
          frequency: { minutes: 5 },
          timeout: { minutes: 5 },
        });

        const provider = new MetadataEntryProvider(client, taskRunner, logger);
        catalog.addEntityProvider(provider);

        // Register processor for bidirectional relation handling
        catalog.addProcessor(new MetadataEntryProcessor());
      },
    });
  },
});

export default geoportiaMetadataBackendModule;
