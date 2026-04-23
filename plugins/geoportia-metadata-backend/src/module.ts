import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { MetadataEntryProvider } from './MetadataEntryProvider';
import { MetadataEntryProcessor } from './MetadataEntryProcessor';
import { AttributeProvider } from './AttributeProvider';
import { AttributeProcessor } from './AttributeProcessor';
import { DatasetProvider } from './DatasetProvider';

const geoportiaMetadataBackendModule = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'geoportia-metadata-provider',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        discovery: coreServices.discovery,
        scheduler: coreServices.scheduler,
        logger: coreServices.logger,
      },
      async init({ catalog, discovery, scheduler, logger }) {
        const metadataTaskRunner = scheduler.createScheduledTaskRunner({
          frequency: { seconds: 30 },
          timeout: { minutes: 5 },
        });

        const attributeTaskRunner = scheduler.createScheduledTaskRunner({
          frequency: { seconds: 30 },
          timeout: { minutes: 5 },
        });

        const datasetTaskRunner = scheduler.createScheduledTaskRunner({
          frequency: { seconds: 30 },
          timeout: { minutes: 5 },
        });

        const metadataProvider = new MetadataEntryProvider(discovery, metadataTaskRunner, logger);
        catalog.addEntityProvider(metadataProvider);

        const attributeProvider = new AttributeProvider(discovery, attributeTaskRunner, logger);
        catalog.addEntityProvider(attributeProvider);

        const datasetProvider = new DatasetProvider(discovery, datasetTaskRunner, logger);
        catalog.addEntityProvider(datasetProvider);

        // Register processors for bidirectional relation handling
        catalog.addProcessor(new MetadataEntryProcessor());
        catalog.addProcessor(new AttributeProcessor());
      },
    });
  },
});

export default geoportiaMetadataBackendModule;
