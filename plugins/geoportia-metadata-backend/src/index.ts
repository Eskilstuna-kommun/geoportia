export { geoportiaMetadataBackendPlugin as default } from './plugin';
export { default as geoportiaMetadataBackendModule } from './module';
export { scaffolderModuleGeoportiaMetadata } from './scaffolder-module';
export { MetadataEntryProcessor } from './MetadataEntryProcessor';
export { AttributeProcessor, RELATION_ATTRIBUTE_OF, RELATION_HAS_ATTRIBUTE } from './AttributeProcessor';
export { createStoreMetadataAction } from './actions';
export type { StoreMetadataActionOptions } from './actions';
export {
  RELATION_DESCRIBES,
  RELATION_DESCRIBED_BY,
} from '@internal/geoportia-metadata-common';
