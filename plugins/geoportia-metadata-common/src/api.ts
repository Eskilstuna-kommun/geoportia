import {
  ActivateTableDescriptionVersion,
  CreateTableDescription,
  ExtendedTableResponse,
  GetTableDescription,
  GetTableDescriptionAtVersion,
  GetTablePreview,
  PreviewResponse,
  RequestOptions,
  TableResponse,
  TypedResponse,
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
}

export { DefaultApiClient as MetadataClient } from './schema/openapi';
