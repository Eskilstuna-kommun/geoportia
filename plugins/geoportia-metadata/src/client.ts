import {
  ActivateTableDescriptionVersion,
  ActivateTableDescriptionVersion200Response,
  CreateTableDescription,
  GetTableDescription,
  GetTableDescriptionAtVersion,
  RequestOptions,
  TableResponse,
  TypedResponse,
} from './schema/openapi';
import { createApiRef } from '@backstage/core-plugin-api';

export interface MetadataApi {
  activateTableDescriptionVersion(
    request: ActivateTableDescriptionVersion,
    options?: RequestOptions,
  ): Promise<TypedResponse<TableResponse>>;

  createTableDescription(
    request: CreateTableDescription,
    options?: RequestOptions,
  ): Promise<TypedResponse<TableResponse>>;

  getTableDescription(
    request: GetTableDescription,
    options?: RequestOptions,
  ): Promise<TypedResponse<ActivateTableDescriptionVersion200Response>>;

  getTableDescriptionAtVersion(
    request: GetTableDescriptionAtVersion,
    options?: RequestOptions,
  ): Promise<TypedResponse<TableResponse>>;
}

export const metadataApiRef = createApiRef<MetadataApi>({
  id: 'plugin.geoportia-metadata.service',
});
