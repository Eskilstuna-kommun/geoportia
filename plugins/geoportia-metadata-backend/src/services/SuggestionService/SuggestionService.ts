import { AuthService } from '@backstage/backend-plugin-api';
import { Knex } from 'knex';
import { TableRow, SuggestionTableRow } from '../../database';
import { InputError, NotFoundError } from '@backstage/errors';
import { CatalogClient } from '@backstage/catalog-client';
import { JsonObject } from '@backstage/types';
import {
  SuggestionService as ISuggestionService,
  MetadataSuggestion,
  AnyCredentials,
} from './types';
import { MetadataEntry } from '../MetadataService/types';

export class SuggestionService implements ISuggestionService {
  constructor(
    private readonly database: Knex,
    private readonly catalogApi?: CatalogClient,
    private readonly auth?: AuthService,
  ) {}

  private async refreshCatalogEntity(entityRef: string) {
    if (!this.catalogApi || !this.auth) {
      return;
    }

    try {
      const token = await this.auth.getPluginRequestToken({
        onBehalfOf: await this.auth.getOwnServiceCredentials(),
        targetPluginId: 'catalog',
      });

      await this.catalogApi.refreshEntity(entityRef, { token: token.token });
    } catch (_e) {
      // best-effort
    }
  }

  async getSuggestions(
    entityRef: string,
    _options: {
      credentials: AnyCredentials;
    },
  ): Promise<MetadataSuggestion[]> {
    if (!entityRef) {
      throw new InputError('entityRef is required');
    }

    const rows = await this.database<SuggestionTableRow>('geoportia_metadata_suggestions')
      .join('geoportia_metadata', 'geoportia_metadata_suggestions.metadata_id', 'geoportia_metadata.id')
      .where('geoportia_metadata.entity_ref', entityRef)
      .select(
        'geoportia_metadata_suggestions.id',
        'geoportia_metadata.entity_ref',
        'geoportia_metadata_suggestions.metadata',
        'geoportia_metadata_suggestions.created_at',
        'geoportia_metadata_suggestions.suggested_by',
      )
      .orderBy('geoportia_metadata_suggestions.created_at', 'desc');

    return rows.map(row => ({
      id: row.id,
      entityRef: row.entity_ref,
      metadata: (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) as JsonObject,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      suggestedBy: row.suggested_by,
    }));
  }

  async acceptSuggestion(
    suggestionId: number,
    _options: {
      credentials: AnyCredentials;
    },
  ): Promise<MetadataEntry> {
    if (!suggestionId) {
      throw new InputError('suggestionId is required');
    }

    return this.database.transaction(async db => {
      // Get the suggestion
      const suggestion = await db<SuggestionTableRow>('geoportia_metadata_suggestions')
        .where({ id: suggestionId })
        .first();

      if (!suggestion) {
        throw new NotFoundError('Suggestion not found');
      }

      // Get the metadata entry
      const metadataEntry = await db<TableRow>('geoportia_metadata')
        .where({ id: suggestion.metadata_id })
        .first();

      if (!metadataEntry) {
        throw new NotFoundError('Metadata entry not found');
      }

      const suggestedMetadata = typeof suggestion.metadata === 'string'
        ? JSON.parse(suggestion.metadata)
        : suggestion.metadata;

      // Update the metadata entry with the suggested metadata
      await db<TableRow>('geoportia_metadata')
        .where({ id: suggestion.metadata_id })
        .update({ metadata: JSON.stringify(suggestedMetadata) });

      // Delete the suggestion after accepting
      await db<SuggestionTableRow>('geoportia_metadata_suggestions')
        .where({ id: suggestionId })
        .del();

      const schema = typeof metadataEntry.schema === 'string'
        ? JSON.parse(metadataEntry.schema)
        : metadataEntry.schema;

      await this.refreshCatalogEntity(metadataEntry.entity_ref);

      return {
        entityRef: metadataEntry.entity_ref,
        schema: schema as JsonObject,
        metadata: suggestedMetadata as JsonObject,
      };
    });
  }
}
