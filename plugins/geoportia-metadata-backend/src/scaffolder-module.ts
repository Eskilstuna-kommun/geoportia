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
  createMetadataChangeSuggestionAction,
  createCreateDatabaseAction,
} from './actions';
import { MetadataService } from './services/MetadataService/MetadataService';
import { SuggestionService } from './services/SuggestionService/SuggestionService';
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
        permissions: coreServices.permissions,
      },
      async init({ scaffolder, database, discovery, auth, rootConfig, permissions }) {
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

        // Register the database creation action
        scaffolder.addActions(
          createCreateDatabaseAction({
            catalogClient,
            auth,
            permissions,
          }),
        );

        scaffolder.addActions(
          createStoreMetadataAction({
            metadataService,
            auth,
          }),
        );

        const suggestionService = new SuggestionService(client, catalogClient, auth);
        scaffolder.addActions(
          createMetadataChangeSuggestionAction({
            suggestionService,
          }),
        );

        const postgresqlProvidersConfig = rootConfig.getOptionalConfig(
          'catalog.providers.postgresql',
        );
        if (postgresqlProvidersConfig) {
          const databases: Record<string, string> = {};
          for (const databaseName of postgresqlProvidersConfig.keys()) {
            databases[databaseName] =
              postgresqlProvidersConfig.getString(databaseName);
          }
          if (Object.keys(databases).length > 0) {
            scaffolder.addActions(
              createCreatePostgresSchemaAction({ databases }),
            );
          }
        }

        const arcgisProvidersConfig = rootConfig.getOptionalConfig(
          'catalog.providers.arcgissde',
        );
        if (arcgisProvidersConfig) {
          const databases: Record<
            string,
            {
              proxyUri: string;
              database: string;
              adminUser: string;
              adminPassword: string;
              defaultSpatialReferenceWkid?: number;
            }
          > = {};
          for (const databaseName of arcgisProvidersConfig.keys()) {
            const dbCfg = arcgisProvidersConfig.getConfig(databaseName);
            databases[databaseName] = {
              proxyUri: dbCfg.getString('proxyUri'),
              database: dbCfg.getString('database'),
              adminUser: dbCfg.getString('adminUser'),
              adminPassword: dbCfg.getString('adminPassword'),
              defaultSpatialReferenceWkid: dbCfg.getOptionalNumber(
                'defaultSpatialReferenceWkid',
              ),
            };
          }
          if (Object.keys(databases).length > 0) {
            scaffolder.addActions(
              createCreateArcgisSdeDatasetAction({ databases }),
            );
          }
        }
      },
    });
  },
});

export default scaffolderModuleGeoportiaMetadata;
