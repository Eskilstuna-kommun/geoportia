import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { InputError } from '@backstage/errors';
import { Knex, knex as createKnex } from 'knex';

export interface CreatePostgresSchemaActionOptions {
  databases: Record<string, string>;
}

const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

function assertIdentifier(name: string, what: string): void {
  if (!IDENTIFIER_REGEX.test(name)) {
    throw new InputError(
      `${what} "${name}" is not a valid PostgreSQL identifier ` +
        `(letters, digits and underscores only, must start with a letter or underscore, max 63 chars).`,
    );
  }
}

export function createCreatePostgresSchemaAction(
  options: CreatePostgresSchemaActionOptions,
) {
  const { databases } = options;

  return createTemplateAction({
    id: 'geoportia:postgres:create-schema',
    description:
      'Creates a new schema in a PostgreSQL database. No-op if the schema already exists.',
    schema: {
      input: {
        type: 'object',
        required: ['database', 'schemaName'],
        properties: {
          database: {
            type: 'string',
            title: 'Database',
            description:
              'metadata.name of the PostgreSQL Resource entity to create the schema in.',
          },
          schemaName: {
            type: 'string',
            title: 'Schema name',
            description: 'Name of the schema to create.',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          database: { type: 'string', title: 'Database' },
          schemaName: { type: 'string', title: 'Schema name' },
          created: {
            type: 'boolean',
            title: 'Created',
            description:
              'True if a new schema was created, false if it already existed.',
          },
        },
      },
    },
    async handler(ctx) {
      const database = (ctx.input.database as string).trim();
      const schemaName = (ctx.input.schemaName as string).trim();

      assertIdentifier(schemaName, 'schemaName');

      const connectionString = databases[database];
      if (!connectionString) {
        throw new InputError(
          `No PostgreSQL database resource configured with name "${database}". ` +
            `Configured: [${Object.keys(databases).join(', ')}]`,
        );
      }

      ctx.logger.info(
        `Creating PostgreSQL schema "${schemaName}" in database "${database}"`,
      );

      let client: Knex | undefined;
      let created = false;
      try {
        client = createKnex({ client: 'pg', connection: connectionString });

        const existing = await client.raw(
          'SELECT 1 FROM information_schema.schemata WHERE schema_name = ?',
          [schemaName],
        );
        if (existing.rows.length > 0) {
          ctx.logger.info(
            `Schema "${schemaName}" already exists in database "${database}", skipping.`,
          );
        } else {
          // schemaName is validated as a safe identifier above.
          await client.raw(`CREATE SCHEMA "${schemaName}"`);
          created = true;
          ctx.logger.info(
            `Created schema "${schemaName}" in database "${database}".`,
          );
        }
      } finally {
        if (client) {
          await client.destroy();
        }
      }

      ctx.output('database', database);
      ctx.output('schemaName', schemaName);
      ctx.output('created', created);
    },
  });
}
