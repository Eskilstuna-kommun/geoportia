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
  deleted?: boolean;
}

export interface MetadataEntryCreate extends MetadataEntry {}

export interface MetadataEntryUpdate {
  entityRef: string;
  schema: JsonObject;
  metadata: JsonObject;
}

export interface MetadataService {

  /** Get a single metadata entry by entityRef. Returns null if not found. */
  getMetadataEntry(
    entityRef: string,
    options: {
      credentials: AnyCredentials;
    },
  ): Promise<MetadataEntry | null>;

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

  /** Mark a metadata entry as deleted or restore it (soft delete). */
  setMetadataEntryDeleted(
    input: { entityRef: string; deleted: boolean },
    options: {
      credentials: AnyCredentials;
    },
  ): Promise<MetadataEntry>;

  /** Get all metadata entries (no authentication required). */
  getMetadataEntriesPublic(): Promise<MetadataEntry[]>;
}
