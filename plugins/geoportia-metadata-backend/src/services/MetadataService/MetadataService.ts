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
  Dataset,
  DatasetCreate,
} from './types';
import { Knex } from 'knex';
import { TableRow, DatasetRow } from '../../database';
import { ConflictError, InputError, NotFoundError } from '@backstage/errors';
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

    await this.database.transaction(async db => {
      const existing = await db<TableRow>('geoportia_metadata')
        .where({ entity_ref: input.entityRef })
        .first();
      if (existing) {
        throw new ConflictError('Metadata entry already exists');
      }

      await db<TableRow>('geoportia_metadata').insert({
        entity_ref: input.entityRef,
        schema: input.schema,
        metadata: input.metadata,
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

    await this.database.transaction(async db => {
      const existing = await db<TableRow>('geoportia_metadata')
        .where({ entity_ref: input.entityRef })
        .first();
      if (!existing) {
        throw new NotFoundError('Metadata entry not found');
      }

      await db<TableRow>('geoportia_metadata')
        .where({ entity_ref: input.entityRef })
        .update({ schema: input.schema, metadata: input.metadata });
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
      const deleted = await db<TableRow>('geoportia_metadata')
        .where({ entity_ref: input.entityRef })
        .del();
      if (deleted === 0) {
        throw new NotFoundError('Metadata entry not found');
      }
    });

    await this.refreshCatalogEntity(input.entityRef);
  }

  async getDatasets(
    _options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<Dataset[]> {
    return this.getDatasetsPublic();
  }

  async getDatasetsPublic(): Promise<Dataset[]> {
    const rows = await this.database<DatasetRow>('geoportia_datasets')
      .select('*')
      .orderBy('name', 'asc');

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      summary: row.summary ?? undefined,
      versioning: row.versioning,
      allowZValues: row.allow_z_values,
      status: row.status,
      createdAt: row.created_at ? String(row.created_at) : undefined,
      createdBy: row.created_by ?? undefined,
    }));
  }

  async createDataset(
    input: DatasetCreate,
    options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<Dataset> {
    if (!input?.name) {
      throw new InputError('name is required');
    }

    // Generate ID from name
    const id = input.name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_åäöÅÄÖ]/gi, '');

    const createdBy = options.credentials.principal?.userEntityRef;

    await this.database.transaction(async db => {
      const existing = await db<DatasetRow>('geoportia_datasets')
        .where({ id })
        .first();
      if (existing) {
        throw new ConflictError(`Dataset with id "${id}" already exists`);
      }

      await db<DatasetRow>('geoportia_datasets').insert({
        id,
        name: input.name,
        summary: input.summary ?? null,
        versioning: input.versioning ?? 'Ej versionerad',
        allow_z_values: input.allowZValues ?? false,
        status: input.status ?? 'Godkänd',
        created_by: createdBy ?? null,
      });
    });

    return {
      id,
      name: input.name,
      summary: input.summary,
      versioning: input.versioning ?? 'Ej versionerad',
      allowZValues: input.allowZValues ?? false,
      status: input.status ?? 'Godkänd',
      createdBy,
    };
  }
}
