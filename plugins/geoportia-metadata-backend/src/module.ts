import { createBackendModule } from '@backstage/backend-plugin-api';
import { catalogProcessingExtensionPoint } from '@backstage/plugin-catalog-node/alpha';
import { MetadataEntitiesProcessor } from './MetadataEntitiesProcessor';
import { metadataServiceRef } from './services/MetadataService/types';

const geoportiaMetadataBackendModule = createBackendModule({
  pluginId: 'catalog',
  moduleId: 'geoportia-metadata-processor',
  register(env) {
    env.registerInit({
      deps: {
        catalog: catalogProcessingExtensionPoint,
        metadata: metadataServiceRef,
      },
      async init({ catalog, metadata }) {
        catalog.addProcessor(new MetadataEntitiesProcessor(metadata));
      },
    });
  },
});

export default geoportiaMetadataBackendModule;
