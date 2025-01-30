import {
  BackstageCredentials,
  BackstageUserPrincipal,
} from '@backstage/backend-plugin-api';
import {
  AttributeTypeEnum,
  PreviewResponse,
  TableResponsePropertiesValue,
} from '../../schema/openapi/generated/models';

export interface TableItem {
  database: string;
  name: string;
  version: number;
  active: boolean;
  title: string;
  owner: string;
  properties: Record<string, TableResponsePropertiesValue>;
  attributes: Attribute[];
}
export interface ExtendedTableItem extends TableItem {
  versions: { version: number; active: boolean }[];
}
export interface Attribute {
  name: string;
  title: string;
  type: AttributeTypeEnum;
  properties: Record<string, TableResponsePropertiesValue>;
}

export interface MetadataService {
  preview(
    input: Pick<TableItem, 'database' | 'name'>,
  ): Promise<PreviewResponse>;

  createTableVersion(
    input: TableItem,
    options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<TableItem>;

  activateTableVersion(
    input: Pick<TableItem, 'database' | 'name' | 'version'>,
    options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<TableItem>;

  getTable(
    request: Pick<TableItem, 'database' | 'name'>,
  ): Promise<ExtendedTableItem>;

  getTableAtVersion(
    request: Pick<TableItem, 'database' | 'name' | 'version'>,
  ): Promise<TableItem>;
}
