export class PostgreSQLSchemasProvider {
  constructor(private uri: string) {}

  async getSchemasMap(): Promise<Map<string, string>> {
    const knex = require('knex')({
      client: 'pg',
      connection: this.uri,
    });

    try {
      const result = await knex.raw(
        'SELECT schema_name, schema_owner FROM information_schema.schemata',
      );

      const schemasMap = new Map<string, string>();
      result.rows.forEach((row: { schema_name: string; schema_owner: string }) => {
        schemasMap.set(row.schema_name, row.schema_owner);
      });

      return schemasMap;
    } finally {
      await knex.destroy();
    }
  }
}
