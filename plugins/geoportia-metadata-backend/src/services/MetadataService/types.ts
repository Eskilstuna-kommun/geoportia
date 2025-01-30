import {
  AuthService,
  BackstageCredentials,
  BackstageUserPrincipal,
  coreServices,
  createServiceFactory,
  createServiceRef,
} from '@backstage/backend-plugin-api';
import {
  AttributeTypeEnum,
  PreviewResponse,
  TableResponsePropertiesValue,
} from '../../schema/openapi/generated/models';
import { MetadataClient } from '@internal/geoportia-metadata-common';

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
  ): Promise<ExtendedTableItem>;

  getTable(
    request: Pick<TableItem, 'database' | 'name'>,
  ): Promise<ExtendedTableItem>;

  getTableAtVersion(
    request: Pick<TableItem, 'database' | 'name' | 'version'>,
  ): Promise<TableItem>;
}

class MetadataServiceFacade implements MetadataService {
  constructor(
    readonly auth: AuthService,
    readonly metadataApi: MetadataClient,
  ) {}

  async createTableVersion(
    input: TableItem,
    options: { credentials: BackstageCredentials<BackstageUserPrincipal> },
  ): Promise<TableItem> {
    const resp = await this.metadataApi.createTableDescription(
      {
        path: {
          database: input.database,
          table: input.name,
        },
        body: input,
      },
      await this.auth.getPluginRequestToken({
        onBehalfOf: options.credentials,
        targetPluginId: 'geoportia-metadata',
      }),
    );
    if (!resp.ok) {
      throw new Error(
        `Request failed with code ${resp.status}: ${await resp.text()}`,
      );
    }
    return resp.json();
  }
  async activateTableVersion(
    input: Pick<TableItem, 'database' | 'name' | 'version'>,
    options: { credentials: BackstageCredentials<BackstageUserPrincipal> },
  ): Promise<ExtendedTableItem> {
    const resp = await this.metadataApi.activateTableDescriptionVersion(
      {
        path: {
          database: input.database,
          table: input.name,
          version: input.version,
        },
      },
      await this.auth.getPluginRequestToken({
        onBehalfOf: options.credentials,
        targetPluginId: 'geoportia-metadata',
      }),
    );
    if (!resp.ok) {
      throw new Error(
        `Request failed with code ${resp.status}: ${await resp.text()}`,
      );
    }
    return resp.json();
  }
  async getTable(
    request: Pick<TableItem, 'database' | 'name'>,
  ): Promise<ExtendedTableItem> {
    const resp = await this.metadataApi.getTableDescription(
      {
        path: {
          database: request.database,
          table: request.name,
        },
      },
      await this.auth.getPluginRequestToken({
        onBehalfOf: await this.auth.getOwnServiceCredentials(),
        targetPluginId: 'geoportia-metadata',
      }),
    );
    if (!resp.ok) {
      throw new Error(
        `Request failed with code ${resp.status}: ${await resp.text()}`,
      );
    }
    return resp.json();
  }
  async getTableAtVersion(
    request: Pick<TableItem, 'database' | 'name' | 'version'>,
  ): Promise<TableItem> {
    const resp = await this.metadataApi.getTableDescriptionAtVersion(
      {
        path: {
          database: request.database,
          table: request.name,
          version: request.version,
        },
      },
      await this.auth.getPluginRequestToken({
        onBehalfOf: await this.auth.getOwnServiceCredentials(),
        targetPluginId: 'geoportia-metadata',
      }),
    );
    if (!resp.ok) {
      throw new Error(
        `Request failed with code ${resp.status}: ${await resp.text()}`,
      );
    }
    return resp.json();
  }

  async preview(
    input: Pick<TableItem, 'database' | 'name'>,
  ): Promise<PreviewResponse> {
    const resp = await this.metadataApi.getTablePreview(
      {
        path: { database: input.database, table: input.name },
      },
      await this.auth.getPluginRequestToken({
        onBehalfOf: await this.auth.getOwnServiceCredentials(),
        targetPluginId: 'geoportia-metadata',
      }),
    );
    if (!resp.ok) {
      throw new Error(
        `Request failed with code ${resp.status}: ${await resp.text()}`,
      );
    }
    return resp.json();
  }
}

export const metadataServiceRef = createServiceRef<MetadataService>({
  id: 'geoportia-metadata.metadata-service',
  defaultFactory: async service =>
    createServiceFactory({
      service,
      deps: {
        auth: coreServices.auth,
        discoveryApi: coreServices.discovery,
      },
      async factory({ auth, discoveryApi }) {
        return new MetadataServiceFacade(
          auth,
          new MetadataClient({ discoveryApi }),
        );
      },
    }),
});
