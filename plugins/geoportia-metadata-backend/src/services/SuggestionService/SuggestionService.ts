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

  async createSuggestion(
    entityRef: string,
    metadata: JsonObject,
    suggestedBy: string,
  ): Promise<{ id: number }> {
    if (!entityRef) {
      throw new InputError('entityRef is required');
    }

    // Find existing metadata entry
    const existing = await this.database<TableRow>('geoportia_metadata')
      .where({ entity_ref: entityRef })
      .first();

    if (!existing) {
      throw new NotFoundError(`Metadata entry not found for entityRef: ${entityRef}`);
    }

    const [inserted] = await this.database<SuggestionTableRow>('geoportia_metadata_suggestions')
      .insert({
        metadata_id: existing.id,
        metadata: JSON.stringify(metadata),
        suggested_by: suggestedBy,
      })
      .returning('id');

    return { id: typeof inserted === 'object' ? inserted.id : inserted };
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

    return rows.map(row => this.toSuggestion(row));
  }

  async getAllSuggestions(options: {
    credentials: AnyCredentials;
    userEntityRef?: string;
    isAdmin: boolean;
  }): Promise<MetadataSuggestion[]> {
    const rows = await this.database<SuggestionTableRow & { entry_metadata: unknown }>(
      'geoportia_metadata_suggestions',
    )
      .join(
        'geoportia_metadata',
        'geoportia_metadata_suggestions.metadata_id',
        'geoportia_metadata.id',
      )
      .select(
        'geoportia_metadata_suggestions.id',
        'geoportia_metadata.entity_ref',
        'geoportia_metadata_suggestions.metadata',
        'geoportia_metadata_suggestions.created_at',
        'geoportia_metadata_suggestions.suggested_by',
        { entry_metadata: 'geoportia_metadata.metadata' },
      )
      .orderBy('geoportia_metadata_suggestions.created_at', 'desc');

    if (options.isAdmin) {
      return rows.map(row => this.toSuggestion(row));
    }

    const userRef = options.userEntityRef?.toLowerCase();
    const userName = userRef?.split('/').pop();

    return rows
      .filter(row => {
        const entryMetadata = this.parseJson(row.entry_metadata);
        return this.matchesUser(entryMetadata, userRef, userName);
      })
      .map(row => this.toSuggestion(row));
  }

  private parseJson(value: unknown): JsonObject {
    if (!value) return {};
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as JsonObject;
      } catch {
        return {};
      }
    }
    return value as JsonObject;
  }

  private toSuggestion(row: SuggestionTableRow & { entity_ref: string }): MetadataSuggestion {
    return {
      id: row.id,
      entityRef: row.entity_ref,
      metadata: this.parseJson(row.metadata),
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      suggestedBy: row.suggested_by,
    };
  }

  private matchesUser(
    entryMetadata: JsonObject,
    userRef: string | undefined,
    userName: string | undefined,
  ): boolean {
    if (!userRef) return false;

    const candidates: string[] = [];

    const pushAll = (value: unknown) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach(v => typeof v === 'string' && candidates.push(v));
      } else if (typeof value === 'string') {
        candidates.push(value);
      }
    };

    pushAll(entryMetadata.contactPersons);
    pushAll(entryMetadata.dataOwners);
    pushAll(entryMetadata.contactPerson);
    pushAll(entryMetadata.dataOwner);

    const layerInfo = entryMetadata.layerInfo as JsonObject | undefined;
    if (layerInfo) {
      pushAll(layerInfo.contactPerson);
      pushAll(layerInfo.contactPersons);
      pushAll(layerInfo.dataOwner);
      pushAll(layerInfo.dataOwners);
    }

    return candidates.some(c => {
      const lower = c.toLowerCase();
      if (lower === userRef) return true;
      if (userName) {
        const normalized = lower.replace(/\s+/g, '').replace(/[-_]/g, '');
        const target = userName.replace(/\s+/g, '').replace(/[-_]/g, '');
        if (normalized === target) return true;
      }
      return false;
    });
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
