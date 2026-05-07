export { geoportiaMetadataBackendPlugin as default } from './plugin';
export { default as geoportiaMetadataBackendModule } from './module';
export { scaffolderModuleGeoportiaMetadata } from './scaffolder-module';
export { MetadataEntryProcessor } from './MetadataEntryProcessor';
export { AttributeProcessor, RELATION_ATTRIBUTE_OF, RELATION_HAS_ATTRIBUTE } from './AttributeProcessor';
export { createStoreMetadataAction } from './actions';
export type { StoreMetadataActionOptions } from './actions';
export {
  createCreatePostgresSchemaAction,
  createCreateArcgisSdeDatasetAction,
} from './actions';
export type {
  CreatePostgresSchemaActionOptions,
  CreateArcgisSdeDatasetActionOptions,
} from './actions';
export { geoportiaPermissionPolicyModule } from './permission-policy-module';
export {
  metadataPermissionRules,
  createMetadataConditions,
  type MetadataEntryResource,
} from './permissions';
export {
  RELATION_DESCRIBES,
  RELATION_DESCRIBED_BY,
} from '@internal/geoportia-metadata-common';
export type { MetadataSuggestion } from './services/SuggestionService/types';
export { SuggestionService } from './services/SuggestionService/SuggestionService';
