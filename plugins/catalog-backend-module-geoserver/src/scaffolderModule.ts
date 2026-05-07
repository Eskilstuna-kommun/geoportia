import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import { createCreateGeoserverLayerAction } from './actions/createGeoserverLayer';
import { GeoserverService } from './services/GeoserverService/GeoserverService';

export const scaffolderModuleGeoserver = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'geoportia-geoserver-actions',
  register(env) {
    env.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        rootConfig: coreServices.rootConfig,
        logger: coreServices.logger,
      },
      async init({ scaffolder, rootConfig, logger }) {
        const geoserverUri = rootConfig.getString(
          'catalog.providers.geoserver.uri',
        );
        const geoserverUsername = rootConfig.getString(
          'catalog.providers.geoserver.username',
        );
        const geoserverPassword = rootConfig.getString(
          'catalog.providers.geoserver.password',
        );

        const geoserverService = new GeoserverService(
          logger,
          geoserverUri,
          geoserverUsername,
          geoserverPassword,
        );

        scaffolder.addActions(
          createCreateGeoserverLayerAction({
            geoserverService,
          }),
        );
      },
    });
  },
});
