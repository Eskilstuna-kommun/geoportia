import {
  AuthService,
  BackstageCredentials,
  BackstageUserPrincipal,
} from '@backstage/backend-plugin-api';
import { NotFoundError } from '@backstage/errors';
import {
  ExtendedTableItem,
  MetadataService as IMetadataService,
  TableItem,
} from './types';
import Database, { Knex } from 'knex';
import { AttributeRow, TableRow } from '../../database';
import {
  AttributeTypeEnum,
  PreviewResponse,
} from '../../schema/openapi/generated/models';
import { CatalogService } from '@backstage/plugin-catalog-node';

export class MetadataService implements IMetadataService {
  constructor(
    private readonly database: Knex,
    private readonly catalogApi: CatalogService,
    private readonly auth: AuthService,
  ) {}

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
      await this.catalogApi.refreshEntity(`table:default/${input.name}`, {
        credentials: await this.auth.getOwnServiceCredentials(),
      });
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
          database: input.database,
          name: input.name,
          version,
          active: false,
          title: input.title,
          owner: input.owner,
          properties: JSON.stringify(input.properties),
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
            properties: JSON.stringify(a.properties),
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
      await this.catalogApi.refreshEntity(`table:default/${input.name}`, {
        credentials: await this.auth.getOwnServiceCredentials(),
      });
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
        properties: JSON.parse(table.properties),
        version: table.version,
        versions: versions.map(v => ({
          active: !!v.active,
          version: v.version,
        })),
        attributes: attributes.map(a => ({
          name: a.name,
          title: a.title,
          type: a.type as AttributeTypeEnum,
          properties: JSON.parse(a.properties),
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
      properties: JSON.parse(table.properties),
      version: table.version,
      attributes: attributes.map(a => ({
        name: a.name,
        title: a.title,
        type: a.type as AttributeTypeEnum,
        properties: JSON.parse(a.properties),
      })),
    };
  }
}
