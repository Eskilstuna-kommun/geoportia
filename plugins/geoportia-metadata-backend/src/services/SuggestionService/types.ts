import {
  BackstageCredentials,
  BackstageUserPrincipal,
  BackstageServicePrincipal,
} from '@backstage/backend-plugin-api';
import { JsonObject } from '@backstage/types';
import { MetadataEntry } from '../MetadataService/types';

/** Credentials that can be either a user or service principal */
export type AnyCredentials = BackstageCredentials<BackstageUserPrincipal | BackstageServicePrincipal>;

export interface MetadataSuggestion {
  id: number;
  entityRef: string;
  metadata: JsonObject;
  createdAt: string;
  suggestedBy: string;
}

export interface SuggestionService {
  /** Get all suggestions for a given entity ref. */
  getSuggestions(
    entityRef: string,
    options: {
      credentials: AnyCredentials;
    },
  ): Promise<MetadataSuggestion[]>;

  /** Accept a suggestion and update the metadata entry. */
  acceptSuggestion(
    suggestionId: number,
    options: {
      credentials: AnyCredentials;
    },
  ): Promise<MetadataEntry>;
}
