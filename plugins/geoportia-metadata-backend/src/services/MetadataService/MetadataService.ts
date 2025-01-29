import {
  BackstageCredentials,
  BackstageUserPrincipal,
} from '@backstage/backend-plugin-api';
import { NotFoundError } from '@backstage/errors';
import {
  ExtendedTableItem,
  MetadataService as IMetadataService,
  TableItem,
} from './types';
import { Knex } from 'knex';
import { AttributeRow, TableRow } from '../../database';
import { AttributeTypeEnum } from '../../schema/openapi/generated/models';

export class MetadataService implements IMetadataService {
  constructor(private readonly database: Knex) {}

  async activateTableVersion(
    input: Pick<TableItem, 'database' | 'name' | 'version'>,
    _options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<TableItem> {
    return await this.database.transaction(async db => {
      await db<TableRow>('table')
        .where({ database: input.database, name: input.name })
        .update({ active: false });
      const result = await db<TableRow>('table')
        .where(input)
        .update({ active: true });
      if (!result) {
        throw new NotFoundError('Table not found');
      }
      return this.getTableAtVersionImpl(input, db);
    });
  }
  async createTableVersion(
    input: TableItem,
    _options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<TableItem> {
    return await this.database.transaction(async db => {
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
