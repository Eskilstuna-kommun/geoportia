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

export interface MetadataEntry {
  entityRef: string;
  schema: unknown;
  metadata: unknown;
}

export interface MetadataEntryCreate extends MetadataEntry {}

export interface MetadataEntryUpdate {
  entityRef: string;
  schema: unknown;
  metadata: unknown;
}

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

  /** Create a new metadata entry identified by its entityRef. */
  createMetadataEntry(
    input: MetadataEntryCreate,
    options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<MetadataEntry>;

  /** Update an existing metadata entry identified by its entityRef. */
  updateMetadataEntry(
    input: MetadataEntryUpdate,
    options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<MetadataEntry>;

  /** Delete a metadata entry (and any stored versions) identified by its entityRef. */
  deleteMetadataEntry(
    input: Pick<MetadataEntry, 'entityRef'>,
    options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<void>;

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

  async createMetadataEntry(
    input: MetadataEntryCreate,
    options: { credentials: BackstageCredentials<BackstageUserPrincipal> },
  ): Promise<MetadataEntry> {
    const resp = await (this.metadataApi as any).createMetadataEntry(
      { body: input },
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

  async updateMetadataEntry(
    input: MetadataEntryUpdate,
    options: { credentials: BackstageCredentials<BackstageUserPrincipal> },
  ): Promise<MetadataEntry> {
    const resp = await (this.metadataApi as any).updateMetadataEntry(
      {
        path: { entityRef: input.entityRef },
        body: { schema: input.schema, metadata: input.metadata },
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

  async deleteMetadataEntry(
    input: Pick<MetadataEntry, 'entityRef'>,
    options: { credentials: BackstageCredentials<BackstageUserPrincipal> },
  ): Promise<void> {
    const resp = await (this.metadataApi as any).deleteMetadataEntry(
      { path: { entityRef: input.entityRef } },
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
