import {
  coreServices,
  createBackendModule,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import {
  createStoreMetadataAction,
  createCreatePostgresSchemaAction,
  createCreateArcgisSdeDatasetAction,
} from './actions';
import { MetadataService } from './services/MetadataService/MetadataService';
import { CatalogClient } from '@backstage/catalog-client';

export const scaffolderModuleGeoportiaMetadata = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'geoportia-metadata-actions',
  register(env) {
    env.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        database: coreServices.database,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
        rootConfig: coreServices.rootConfig,
      },
      async init({ scaffolder, database, discovery, auth, rootConfig }) {
        const client = await database.getClient();

        // Run migrations if needed (use separate table to avoid conflicts)
        if (!database.migrations?.skip) {
          await client.migrate.latest({
            directory: resolvePackagePath(
              '@internal/backstage-plugin-geoportia-metadata-backend',
              'migrations',
            ),
            tableName: 'geoportia_metadata_knex_migrations',
          });
        }

        const catalogClient = new CatalogClient({ discoveryApi: discovery });
        const metadataService = new MetadataService(client, catalogClient, auth);

        scaffolder.addActions(
          createStoreMetadataAction({
            metadataService,
            auth,
          }),
        );

        const postgresUri = rootConfig.getOptionalString(
          'catalog.providers.postgresql.uri',
        );
        if (postgresUri) {
          scaffolder.addActions(
            createCreatePostgresSchemaAction({ baseUri: postgresUri }),
          );
        }

        const arcgisProxyUri = rootConfig.getOptionalString(
          'catalog.providers.arcgissde.proxyUri',
        );
        const arcgisAdminUser = rootConfig.getOptionalString(
          'catalog.providers.arcgissde.adminUser',
        );
        const arcgisAdminPassword = rootConfig.getOptionalString(
          'catalog.providers.arcgissde.adminPassword',
        );
        const arcgisDefaultDatabase = rootConfig.getOptionalString(
          'catalog.providers.arcgissde.database',
        );
        const arcgisDefaultWkid = rootConfig.getOptionalNumber(
          'catalog.providers.arcgissde.defaultSpatialReferenceWkid',
        );
        if (arcgisProxyUri && arcgisAdminUser && arcgisAdminPassword) {
          scaffolder.addActions(
            createCreateArcgisSdeDatasetAction({
              proxyUri: arcgisProxyUri,
              adminUser: arcgisAdminUser,
              adminPassword: arcgisAdminPassword,
              defaultDatabase: arcgisDefaultDatabase,
              defaultSpatialReferenceWkid: arcgisDefaultWkid,
            }),
          );
        }
      },
    });
  },
});

export default scaffolderModuleGeoportiaMetadata;
