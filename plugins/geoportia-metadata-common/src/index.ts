/***/
/**
 * Common functionalities for the geoportia-metadata-common plugin.
 *
 * @packageDocumentation
 */

export { type MetadataApi, MetadataClient, type MetadataEntry } from './api';
export { RELATION_DESCRIBES, RELATION_DESCRIBED_BY } from './relations';
export {
  type DatasetEntity,
  type DatasetSpec,
  datasetEntityValidator,
  isDatasetEntity,
} from './dataset';
 
export { RESOURCE_TYPE_METADATA_ENTRY,
  RESOURCE_TYPE_DATABASE,
  metadataEntryReadPermission,
  metadataEntryCreatePermission,
  metadataEntryUpdatePermission,
  metadataEntryDeletePermission,
  metadataEntrySuggestPermission,
  metadataSensitiveReadPermission,
  metadataDelegateRolePermission,
  databaseCreatePermission,
  geoportiaMetadataPermissions,
  GEOPORTIA_ROLES,
  type GeoportiaRole,
} from './permissions';
