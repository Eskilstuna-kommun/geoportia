import {
  AuthService,
  BackstageCredentials,
  BackstageUserPrincipal,
} from '@backstage/backend-plugin-api';
import {
  ExtendedTableItem,
  MetadataService as IMetadataService,
  MetadataEntry,
  MetadataEntryCreate,
  MetadataEntryUpdate,
  TableItem,
} from './types';
import Database, { Knex } from 'knex';
import { AttributeRow, TableRow } from '../../database';
import {
  AttributeTypeEnum,
  PreviewResponse,
} from '../../schema/openapi/generated/models';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { ConflictError, InputError, NotFoundError } from '@backstage/errors';
import { parseEntityRef } from '@backstage/catalog-model';
import { CatalogClient } from '@backstage/catalog-client';

export class MetadataService implements IMetadataService {
  private readonly ajv: Ajv;

  constructor(
    private readonly database: Knex,
    private readonly catalogApi?: CatalogClient,
    private readonly auth?: AuthService,
  ) {
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  private validateSchemaAndData(schema: unknown, metadata: unknown) {
    // Basic structural checks
    if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) {
      throw new InputError('schema must be a JSON object');
    }
    if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
      throw new InputError('metadata must be a JSON object');
    }

    try {
      const validate = this.ajv.compile(schema as object);
      const ok = validate(metadata);
      if (!ok) {
        throw new InputError(
          `metadata does not match schema: ${this.ajv.errorsText(validate.errors)}`,
        );
      }
    } catch (e: any) {
      // If compilation fails, it is likely an invalid JSON schema.
      if (e instanceof InputError) throw e;
      throw new InputError(`Invalid schema: ${e?.message ?? String(e)}`);
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

  preview(
    input: Pick<TableItem, 'database' | 'name'>,
  ): Promise<PreviewResponse> {
    const database = Database({ client: 'pg', connection: input.database });
    return database.transaction(async db => {
      const columns = await db.table(input.name.split('.')[1]).columnInfo();
      const head = await db.select().from(input.name).limit(10);
      return {
        rows: (await db(input.name).count().first())!.count as number,
        columns: Object.keys(columns),
        head: head.map(row =>
          Object.entries(columns).map(([key, value]) =>
            value.type === 'USER-DEFINED' ? '[geometry]' : row[key],
          ),
        ),
        values: await Promise.all(
          Object.entries(columns).map(async ([key, value]) => {
            const nulls = (await db(input.name).count().whereNull(key).first())!
              .nulls as number;
            if (value.type === 'USER-DEFINED') {
              return { nulls };
            }
            const unique = await db(input.name)
              .select(key)
              .count('* AS count')
              .whereNotNull(key)
              .groupBy(key)
              .orderBy([{ column: 'count', order: 'desc' }, { column: key }])
              .limit(10);
            const hasWorthwhileUnique = unique.some(
              u => (u.count as number) > 1,
            );
            return {
              nulls,
              countUnique: (await db(input.name).countDistinct(key).first())!
                .count as number,
              unique: hasWorthwhileUnique
                ? unique.map(u => ({
                    value: u[key],
                    count: u.count as number,
                  }))
                : undefined,
            };
          }),
        ),
      };
    });
  }

  async activateTableVersion(
    input: Pick<TableItem, 'database' | 'name' | 'version'>,
    _options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<ExtendedTableItem> {
    const res = await this.database.transaction(async db => {
      await db<TableRow>('table')
        .where({ database: input.database, name: input.name })
        .update({ active: false });
      const result = await db<TableRow>('table')
        .where(input)
        .update({ active: true });
      if (!result) {
        throw new NotFoundError('Table not found');
      }

      const versions = await db<TableRow>('table')
        .where(input)
        .select(['active', 'version']);
      const table = await this.getTableAtVersionImpl(input, db);
      return {
        ...table,
        versions: versions.map(v => ({
          active: !!v.active,
          version: v.version,
        })),
      };
    });

    try {
      await this.refreshCatalogEntity(`table:default/${input.name}`);
    } catch (_e) {
      // no-op
    }

    return res;
  }
  async createTableVersion(
    input: TableItem,
    _options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<TableItem> {
    const res = await this.database.transaction(async db => {
      const previousVersion = await db<TableRow>('table')
        .where({ database: input.database, name: input.name })
        .orderBy('version', 'desc')
        .first();
      const version = previousVersion ? previousVersion.version + 1 : 1;
      const [result] = await db<TableRow>('table')
        .insert({
          entity_ref: `table:default/${input.name}`,
          database: input.database,
          name: input.name,
          version,
          active: false,
          schema: {},
          metadata: {
            title: input.title,
            owner: input.owner,
            properties: input.properties,
            attributes: input.attributes,
          },
          title: input.title,
          owner: input.owner,
          properties: input.properties.toString(),
        })
        .returning(['id']);
      if (!result) {
        throw new Error('Could not create new version');
      }
      if (input.attributes.length > 0) {
        await db<AttributeRow>('attribute').insert(
          input.attributes.map(a => ({
            table_id: result.id,
            name: a.name,
            title: a.title,
            type: a.type,
            properties: a.properties.toString(),
          })),
        );
      }
      return this.getTableAtVersionImpl(
        {
          database: input.database,
          name: input.name,
          version,
        },
        db,
      );
    });

    try {
      await this.refreshCatalogEntity(`table:default/${input.name}`);
    } catch (_e) {
      // no-op
    }

    return res;
  }
  async getTable(
    request: Pick<TableItem, 'database' | 'name'>,
  ): Promise<ExtendedTableItem> {
    return await this.database.transaction(async db => {
      const table =
        (await db<TableRow>('table')
          .where(request)
          .andWhere({ active: true })
          .first()) ??
        (await db<TableRow>('table')
          .where(request)
          .orderBy('version', 'desc')
          .first());
      if (!table) {
        throw new NotFoundError('Table not found');
      }
      const attributes = await db<AttributeRow>('attribute')
        .where({ table_id: table.id })
        .select();
      const versions = await db<TableRow>('table')
        .where(request)
        .select(['active', 'version']);
      return {
        database: table.database,
        name: table.name,
        active: !!table.active,
        title: table.title,
        owner: table.owner,
        properties:
          typeof (table as any).properties === 'string'
            ? JSON.parse((table as any).properties)
            : ((table as any).properties ?? {}),
        version: table.version,
        versions: versions.map(v => ({
          active: !!v.active,
          version: v.version,
        })),
        attributes: attributes.map(a => ({
          name: a.name,
          title: a.title,
          type: a.type as AttributeTypeEnum,
          properties:
            typeof (a as any).properties === 'string'
              ? JSON.parse((a as any).properties)
              : ((a as any).properties ?? {}),
        })),
      };
    });
  }
  async getTableAtVersion(
    request: Pick<TableItem, 'database' | 'name' | 'version'>,
  ): Promise<TableItem> {
    return await this.database.transaction(async db =>
      this.getTableAtVersionImpl(request, db),
    );
  }

  private async getTableAtVersionImpl(
    request: Pick<TableItem, 'database' | 'name' | 'version'>,
    db: Knex.Transaction,
  ): Promise<TableItem> {
    const table = await db<TableRow>('table').where(request).first();
    if (!table) {
      throw new NotFoundError('Table not found');
    }
    const attributes = await db<AttributeRow>('attribute')
      .where({ table_id: table.id })
      .select();
    return {
      database: table.database,
      name: table.name,
      active: !!table.active,
      title: table.title,
      owner: table.owner,
      properties:
        typeof (table as any).properties === 'string'
          ? JSON.parse((table as any).properties)
          : ((table as any).properties ?? {}),
      version: table.version,
      attributes: attributes.map(a => ({
        name: a.name,
        title: a.title,
        type: a.type as AttributeTypeEnum,
        properties:
          typeof (a as any).properties === 'string'
            ? JSON.parse((a as any).properties)
            : ((a as any).properties ?? {}),
      })),
    };
  }
}
