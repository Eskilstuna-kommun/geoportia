import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { GeoserverDataProvider } from './GeoserverDataProvider';
import { GeoserverEntitiesProcessor } from './GeoserverEntitiesProcessor';

export const catalogModuleGeoserver = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'geoserver',
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
        const geoserverUri = rootConfig.getString(
          'catalog.providers.geoserver.uri',
        );
        const geoserverUsername = rootConfig.getString(
          'catalog.providers.geoserver.username',
        );
        const geoserverPassword = rootConfig.getString(
          'catalog.providers.geoserver.password',
        );

        const ignoreWorkspaces =
          rootConfig.getOptionalStringArray(
            'catalog.providers.geoserver.ignoreWorkspaces',
          ) ?? [];

        const provider = new GeoserverDataProvider(
          geoserverUri,
          geoserverUsername,
          geoserverPassword,
          ignoreWorkspaces,
          taskRunner,
          logger,
        );
        catalog.addEntityProvider(provider);
        const processor = new GeoserverEntitiesProcessor(logger);
        catalog.addProcessor(processor);
      },
    });
  },
});
