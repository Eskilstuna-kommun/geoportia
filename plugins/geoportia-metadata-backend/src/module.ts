import {
  coreServices,
  createBackendModule,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { MetadataEntryProvider } from './MetadataEntryProvider';

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

        if (!database.migrations?.skip) {
          // Use a separate migrations table to avoid conflicts with catalog migrations
          await client.migrate.latest({
            directory: resolvePackagePath(
              '@internal/backstage-plugin-geoportia-metadata-backend',
              'migrations',
            ),
            tableName: 'knex_migrations_geoportia_metadata',
          });
        }

        const taskRunner = scheduler.createScheduledTaskRunner({
          frequency: { minutes: 5 },
          timeout: { minutes: 5 },
        });

        const provider = new MetadataEntryProvider(client, taskRunner, logger);
        catalog.addEntityProvider(provider);
      },
    });
  },
});

export default geoportiaMetadataBackendModule;
