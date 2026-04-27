import {
  coreServices,
  createBackendModule,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
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
        database: coreServices.database,
        scheduler: coreServices.scheduler,
        logger: coreServices.logger,
      },
      async init({ catalog, database, scheduler, logger }) {
        const client = await database.getClient();
        
        // Run migrations if needed (use separate table to avoid conflicts with catalog migrations)
        if (!database.migrations?.skip) {
          await client.migrate.latest({
            directory: resolvePackagePath(
              '@internal/backstage-plugin-geoportia-metadata-backend',
              'migrations',
            ),
            tableName: 'geoportia_metadata_knex_migrations',
          });
        }

        const metadataTaskRunner = scheduler.createScheduledTaskRunner({
          frequency: { seconds: 30 },
          timeout: { minutes: 5 },
        });

        const attributeTaskRunner = scheduler.createScheduledTaskRunner({
          frequency: { seconds: 30 },
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
