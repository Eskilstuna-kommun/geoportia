import {
  AuthService,
} from '@backstage/backend-plugin-api';
import {
  MetadataService as IMetadataService,
  MetadataEntry,
  MetadataEntryCreate,
  MetadataEntryUpdate,
  AnyCredentials,
} from './types';
import { Knex } from 'knex';
import { TableRow } from '../../database';
import { ConflictError, InputError, NotFoundError } from '@backstage/errors';
import { CatalogClient } from '@backstage/catalog-client';
import { JsonObject } from '@backstage/types';
import * as z from 'zod';

export class MetadataService implements IMetadataService {
  constructor(
    private readonly database: Knex,
    private readonly catalogApi?: CatalogClient,
    private readonly auth?: AuthService,
  ) {}

  private readonly zodSchemaCache = new Map<string, z.ZodType>();

  private getZodSchemaFromJsonSchema(schema: unknown): z.ZodType {
    if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
      throw new InputError('schema must be a JSON object');
    }

    // Cache by JSON stringification when possible.
    let cacheKey: string | undefined;
    try {
      cacheKey = JSON.stringify(schema);
    } catch {
      cacheKey = undefined;
    }

    if (cacheKey) {
      const cached = this.zodSchemaCache.get(cacheKey);
      if (cached) return cached;
    }

    let zodSchema: z.ZodType;
    try {
      zodSchema = (z as { fromJSONSchema: (schema: object) => z.ZodType }).fromJSONSchema(schema as object);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      throw new InputError(`Invalid schema: ${errorMessage}`);
    }

    if (cacheKey) {
      // Keep the cache bounded.
      if (this.zodSchemaCache.size > 200) {
        const firstKey = this.zodSchemaCache.keys().next().value;
        if (firstKey) this.zodSchemaCache.delete(firstKey);
      }
      this.zodSchemaCache.set(cacheKey, zodSchema);
    }

    return zodSchema;
  }

  private validateSchemaAndData(schema: unknown, metadata: unknown) {
    const zodSchema = this.getZodSchemaFromJsonSchema(schema);
    const parsed = zodSchema.safeParse(metadata);
    if (!parsed.success) {
      throw new InputError(`metadata does not match schema: ${parsed.error.message}`);
    }
  }

  private async refreshCatalogEntity(entityRef: string) {
    if (!this.catalogApi || !this.auth) {
      return;
    }

    try {
      const token = await this.auth.getPluginRequestToken({
        onBehalfOf: await this.auth.getOwnServiceCredentials(),
        targetPluginId: 'catalog',
      });

      // Refresh entity via the catalog API
      await this.catalogApi.refreshEntity(entityRef, { token: token.token });
    } catch (_e) {
      // best-effort
    }
  }

  async createMetadataEntry(
    input: MetadataEntryCreate,
    _options: {
      credentials: AnyCredentials;
    },
  ): Promise<MetadataEntry> {
    if (!input?.entityRef) {
      throw new InputError('entityRef is required');
    }
    this.validateSchemaAndData(input.schema, input.metadata);

    await this.database.transaction(async db => {
      const existing = await db<TableRow>('geoportia_metadata')
        .where({ entity_ref: input.entityRef })
        .first();
      if (existing) {
        throw new ConflictError('Metadata entry already exists');
      }

      await db<TableRow>('geoportia_metadata').insert({
        entity_ref: input.entityRef,
        schema: JSON.stringify(input.schema),
        metadata: JSON.stringify(input.metadata),
      });
    });

    await this.refreshCatalogEntity(input.entityRef);
    return { entityRef: input.entityRef, schema: input.schema, metadata: input.metadata };
  }

  async updateMetadataEntry(
    input: MetadataEntryUpdate,
    _options: {
      credentials: AnyCredentials;
    },
  ): Promise<MetadataEntry> {
    if (!input?.entityRef) {
      throw new InputError('entityRef is required');
    }
    this.validateSchemaAndData(input.schema, input.metadata);

    await this.database.transaction(async db => {
      const existing = await db<TableRow>('geoportia_metadata')
        .where({ entity_ref: input.entityRef })
        .first();
      if (!existing) {
        throw new NotFoundError('Metadata entry not found');
      }

      await db<TableRow>('geoportia_metadata')
        .where({ entity_ref: input.entityRef })
        .update({ schema: JSON.stringify(input.schema), metadata: JSON.stringify(input.metadata) });
    });

    await this.refreshCatalogEntity(input.entityRef);
    return { entityRef: input.entityRef, schema: input.schema, metadata: input.metadata };
  }

  async deleteMetadataEntry(
    input: Pick<MetadataEntry, 'entityRef'>,
    _options: {
      credentials: AnyCredentials;
    },
  ): Promise<void> {
    if (!input?.entityRef) {
      throw new InputError('entityRef is required');
    }

    await this.database.transaction(async db => {
      const deleted = await db<TableRow>('geoportia_metadata')
        .where({ entity_ref: input.entityRef })
        .del();
      if (deleted === 0) {
        throw new NotFoundError('Metadata entry not found');
      }
    });

    await this.refreshCatalogEntity(input.entityRef);
  }

  async getMetadataEntriesPublic(): Promise<MetadataEntry[]> {
    const rows = await this.database<TableRow>('geoportia_metadata')
      .select('*')
      .orderBy('entity_ref', 'asc');

    return rows.map(row => ({
      entityRef: row.entity_ref,
      schema: (typeof row.schema === 'string' ? JSON.parse(row.schema) : row.schema) as JsonObject,
      metadata: (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) as JsonObject,
    }));
  }
}
