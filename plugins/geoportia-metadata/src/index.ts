export {
  geoportiaMetadataPlugin,
  MetadataEntryViewer,
  EntityMetadataEntryContent,
} from './plugin';

export type {
  MetadataEntryViewerProps,
  EntityMetadataEntryContentProps,
} from './plugin';

export {
  GeoPortiaMetadataFieldExtension,
  type GeoPortiaMetadataFieldValue,
  type GeoPortiaMetadataFieldUiOptions,
} from './scaffolder';

export { geoportiaMetadataTranslationRef } from './translation';

export { metadataApiRef, MetadataClient } from './client';
export type { MetadataApi } from './client';

export { CreateDatasetDialog } from './components/CreateDatasetDialog';
export type { CreateDatasetDialogProps } from './components/CreateDatasetDialog';
