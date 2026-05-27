import {
  coreServices,
  createBackendModule,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { DatabaseManager } from '@backstage/backend-defaults/database';
import { MetadataEntryProvider } from './MetadataEntryProvider';
import { MetadataEntryProcessor } from './MetadataEntryProcessor';
import { AttributeProvider } from './AttributeProvider';
import { AttributeProcessor } from './AttributeProcessor';

const geoportiaMetadataBackendModule = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'geoportia-metadata-provider',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        rootConfig: coreServices.rootConfig,
        scheduler: coreServices.scheduler,
        logger: coreServices.logger,
        lifecycle: coreServices.lifecycle,
      },
      async init({ catalog, rootConfig, scheduler, logger, lifecycle }) {
        const geoportiaMetadataDb = DatabaseManager.fromConfig(rootConfig).forPlugin(
          'geoportia-metadata',
          { logger, lifecycle },
        );
        const client = await geoportiaMetadataDb.getClient();

        // Run migrations on the shared geoportia-metadata DB. Use the same
        // tableName (knex default) as plugin.ts so they don't conflict.
        if (!geoportiaMetadataDb.migrations?.skip) {
          await client.migrate.latest({
            directory: resolvePackagePath(
              '@internal/backstage-plugin-geoportia-metadata-backend',
              'migrations',
            ),
          });
        }

        const metadataTaskRunner = scheduler.createScheduledTaskRunner({
          frequency: { seconds: 5 },
          timeout: { minutes: 5 },
        });

        const attributeTaskRunner = scheduler.createScheduledTaskRunner({
          frequency: { seconds: 5 },
          timeout: { minutes: 5 },
        });

        const metadataProvider = new MetadataEntryProvider(client, metadataTaskRunner, logger);
        catalog.addEntityProvider(metadataProvider);

        const attributeProvider = new AttributeProvider(client, attributeTaskRunner, logger);
        catalog.addEntityProvider(attributeProvider);

        // Register processors for bidirectional relation handling
        catalog.addProcessor(new MetadataEntryProcessor());
        catalog.addProcessor(new AttributeProcessor());
      },
    });
  },
});

export default geoportiaMetadataBackendModule;
