import {
  ActivateTableDescriptionVersion,
  CreateMetadataEntry,
  CreateTableDescription,
  DeleteMetadataEntry,
  ExtendedTableResponse,
  GetTableDescription,
  GetTableDescriptionAtVersion,
  GetTablePreview,
  MetadataEntry,
  PreviewResponse,
  RequestOptions,
  TableResponse,
  TypedResponse,
  UpdateMetadataEntry,
} from './schema/openapi';

export interface MetadataApi {
  getTablePreview(
    request: GetTablePreview,
    options?: RequestOptions,
  ): Promise<TypedResponse<PreviewResponse>>;

  activateTableDescriptionVersion(
    request: ActivateTableDescriptionVersion,
    options?: RequestOptions,
  ): Promise<TypedResponse<ExtendedTableResponse>>;

  createTableDescription(
    request: CreateTableDescription,
    options?: RequestOptions,
  ): Promise<TypedResponse<TableResponse>>;

  getTableDescription(
    request: GetTableDescription,
    options?: RequestOptions,
  ): Promise<TypedResponse<ExtendedTableResponse>>;

  getTableDescriptionAtVersion(
    request: GetTableDescriptionAtVersion,
    options?: RequestOptions,
  ): Promise<TypedResponse<TableResponse>>;

  createMetadataEntry(
    request: CreateMetadataEntry,
    options?: RequestOptions,
  ): Promise<TypedResponse<MetadataEntry>>;

  updateMetadataEntry(
    request: UpdateMetadataEntry,
    options?: RequestOptions,
  ): Promise<TypedResponse<MetadataEntry>>;

  deleteMetadataEntry(
    request: DeleteMetadataEntry,
    options?: RequestOptions,
  ): Promise<TypedResponse<void>>;
}

export { DefaultApiClient as MetadataClient } from './schema/openapi';
