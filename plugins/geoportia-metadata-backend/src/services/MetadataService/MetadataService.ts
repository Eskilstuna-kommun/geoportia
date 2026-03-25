import {
  AuthService,
  BackstageCredentials,
  BackstageUserPrincipal,
} from '@backstage/backend-plugin-api';
import {
  MetadataService as IMetadataService,
  MetadataEntry,
  MetadataEntryCreate,
  MetadataEntryUpdate,
} from './types';
import { Knex } from 'knex';
import { AttributeRow, TableRow } from '../../database';
import { ConflictError, InputError, NotFoundError } from '@backstage/errors';
import { parseEntityRef } from '@backstage/catalog-model';
import { CatalogClient } from '@backstage/catalog-client';
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
      zodSchema = (z as any).fromJSONSchema(schema);
    } catch (e: any) {
      throw new InputError(`Invalid schema: ${e?.message ?? String(e)}`);
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

      // CatalogClient uses token-based auth.
      await (this.catalogApi as any).refreshEntity(entityRef, { token });
    } catch (_e) {
      // best-effort
    }
  }

  async createMetadataEntry(
    input: MetadataEntryCreate,
    _options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<MetadataEntry> {
    if (!input?.entityRef) {
      throw new InputError('entityRef is required');
    }
    this.validateSchemaAndData(input.schema, input.metadata);

    const ref = parseEntityRef(input.entityRef);
    const databaseKey = `${ref.kind}:${ref.namespace ?? 'default'}`;
    const nameKey = ref.name;

    await this.database.transaction(async db => {
      const existing = await db<TableRow>('table')
        .where({ entity_ref: input.entityRef })
        .andWhere({ active: true })
        .first();
      if (existing) {
        throw new ConflictError('Metadata entry already exists');
      }

      const metaObj = input.metadata as any;
      await db<TableRow>('table').insert({
        entity_ref: input.entityRef,
        database: databaseKey,
        name: nameKey,
        version: 1,
        active: true,
        schema: input.schema,
        metadata: input.metadata,
        // Legacy fields
        title: typeof metaObj?.title === 'string' ? metaObj.title : nameKey,
        owner: typeof metaObj?.owner === 'string' ? metaObj.owner : 'unknown',
        properties: metaObj?.properties ?? {},
      });
    });

    await this.refreshCatalogEntity(input.entityRef);
    return { entityRef: input.entityRef, schema: input.schema, metadata: input.metadata };
  }

  async updateMetadataEntry(
    input: MetadataEntryUpdate,
    _options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<MetadataEntry> {
    if (!input?.entityRef) {
      throw new InputError('entityRef is required');
    }
    this.validateSchemaAndData(input.schema, input.metadata);

    const ref = parseEntityRef(input.entityRef);
    const databaseKey = `${ref.kind}:${ref.namespace ?? 'default'}`;
    const nameKey = ref.name;

    await this.database.transaction(async db => {
      const previousVersion = await db<TableRow>('table')
        .where({ entity_ref: input.entityRef })
        .orderBy('version', 'desc')
        .first();
      if (!previousVersion) {
        throw new NotFoundError('Metadata entry not found');
      }
      const version = (previousVersion.version ?? 0) + 1;

      await db<TableRow>('table')
        .where({ entity_ref: input.entityRef })
        .update({ active: false });

      const metaObj = input.metadata as any;
      await db<TableRow>('table').insert({
        entity_ref: input.entityRef,
        database: databaseKey,
        name: nameKey,
        version,
        active: true,
        schema: input.schema,
        metadata: input.metadata,
        // Legacy fields
        title: typeof metaObj?.title === 'string' ? metaObj.title : nameKey,
        owner: typeof metaObj?.owner === 'string' ? metaObj.owner : 'unknown',
        properties: metaObj?.properties ?? {},
      });
    });

    await this.refreshCatalogEntity(input.entityRef);
    return { entityRef: input.entityRef, schema: input.schema, metadata: input.metadata };
  }

  async deleteMetadataEntry(
    input: Pick<MetadataEntry, 'entityRef'>,
    _options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<void> {
    if (!input?.entityRef) {
      throw new InputError('entityRef is required');
    }

    await this.database.transaction(async db => {
      const rows = await db<TableRow>('table')
        .where({ entity_ref: input.entityRef })
        .select(['id']);
      if (rows.length === 0) {
        throw new NotFoundError('Metadata entry not found');
      }

      const ids = rows.map(r => r.id);
      await db<AttributeRow>('attribute').whereIn('table_id', ids).del();
      await db<TableRow>('table').where({ entity_ref: input.entityRef }).del();
    });

    await this.refreshCatalogEntity(input.entityRef);
  }
}
