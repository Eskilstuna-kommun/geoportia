import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node/alpha';
import { createStoreMetadataAction } from './actions';

export const scaffolderModuleGeoportiaMetadata = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'geoportia-metadata-actions',
  register(env) {
    env.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
        discovery: coreServices.discovery,
        auth: coreServices.auth,
      },
      async init({ scaffolder, discovery, auth }) {
        scaffolder.addActions(
          createStoreMetadataAction({
            discovery,
            auth,
          }),
        );
      },
    });
  },
});

export default scaffolderModuleGeoportiaMetadata;
