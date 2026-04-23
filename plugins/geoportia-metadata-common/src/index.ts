/***/
/**
 * Common functionalities for the geoportia-metadata-common plugin.
 *
 * @packageDocumentation
 */

export { type MetadataApi, MetadataClient } from './api';
export { RELATION_DESCRIBES, RELATION_DESCRIBED_BY } from './relations';
export {
  type DatasetEntity,
  type DatasetSpec,
  datasetEntityValidator,
  isDatasetEntity,
} from './dataset';
