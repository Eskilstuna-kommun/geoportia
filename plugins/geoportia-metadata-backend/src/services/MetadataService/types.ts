import {
  BackstageCredentials,
  BackstageUserPrincipal,
  BackstageServicePrincipal,
} from '@backstage/backend-plugin-api';
import { JsonObject } from '@backstage/types';

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

  deleteMetadataEntry(
    input: Pick<MetadataEntry, 'entityRef'>,
    options: {
      credentials: AnyCredentials;
    },
  ): Promise<void>;

  /** Get all metadata entries (no authentication required). */
  getMetadataEntriesPublic(): Promise<MetadataEntry[]>;
}
