import {
  AuthService,
  BackstageCredentials,
  BackstageUserPrincipal,
  BackstageServicePrincipal,
  coreServices,
  createServiceFactory,
  createServiceRef,
} from '@backstage/backend-plugin-api';
import { JsonObject } from '@backstage/types';
import { MetadataClient } from '@internal/geoportia-metadata-common';

/** Credentials that can be either a user or service principal */
export type AnyCredentials = BackstageCredentials<BackstageUserPrincipal | BackstageServicePrincipal>;

export interface MetadataEntry {
  entityRef: string;
  schema: JsonObject;
  metadata: JsonObject;
}

export interface MetadataEntryCreate extends MetadataEntry {}

export interface MetadataEntryUpdate {
  entityRef: string;
  schema: JsonObject;
  metadata: JsonObject;
}

export interface MetadataService {

  /** Create a new metadata entry identified by its entityRef. */
  createMetadataEntry(
    input: MetadataEntryCreate,
    options: {
      credentials: AnyCredentials;
    },
  ): Promise<MetadataEntry>;

  /** Update an existing metadata entry identified by its entityRef. */
  updateMetadataEntry(
    input: MetadataEntryUpdate,
    options: {
      credentials: AnyCredentials;
    },
  ): Promise<MetadataEntry>;

  /** Delete a metadata entry (and any stored versions) identified by its entityRef. */
  deleteMetadataEntry(
    input: Pick<MetadataEntry, 'entityRef'>,
    options: {
      credentials: AnyCredentials;
    },
  ): Promise<void>;

  /** Get all metadata entries (no authentication required). */
  getMetadataEntriesPublic(): Promise<MetadataEntry[]>;
}

class MetadataServiceFacade implements MetadataService {
  constructor(
    readonly auth: AuthService,
    readonly metadataApi: MetadataClient,
  ) {}

  async createMetadataEntry(
    input: MetadataEntryCreate,
    options: { credentials: AnyCredentials },
  ): Promise<MetadataEntry> {
    const resp = await this.metadataApi.createMetadataEntry(
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
    options: { credentials: AnyCredentials },
  ): Promise<MetadataEntry> {
    const resp = await this.metadataApi.updateMetadataEntry(
      {
        path: { entityRef: input.entityRef},
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
    options: { credentials: AnyCredentials },
  ): Promise<void> {
    const resp = await this.metadataApi.deleteMetadataEntry(
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

  async getMetadataEntriesPublic(): Promise<MetadataEntry[]> {
    throw new Error('getMetadataEntriesPublic is not supported in the facade - call the API directly');
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
