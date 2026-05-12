import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  PostgreSQLDatabaseService,
  ViewTable,
} from '@internal/backstage-plugin-postgresql-db-handler-backend/src/services/PostgreSQLDatabaseService';

export interface CreatePostgreSQLViewActionOptions {
  connectionString: string;
}

export function createCreatePostgreSQLViewAction(
  options: CreatePostgreSQLViewActionOptions,
) {
  return createTemplateAction({
    id: 'postgresql:create-view',
    description: 'Creates a new view in a PostgreSQL database.',
    schema: {
      input: {
        type: 'object',
        required: ['viewName', 'schemaName', 'viewTables'],
        properties: {
          viewName: {
            type: 'string',
            description: 'The name of the view to create.',
          },
          schemaName: {
            type: 'string',
            description: 'The name of the schema to create the view in.',
          },
          viewTables: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'columns'],
              properties: {
                name: {
                  type: 'string',
                  description: 'The name of the table to include in the view.',
                },
                columns: {
                  type: 'array',
                  items: {
                    type: 'string',
                    description:
                      'The name of the column to include in the view.',
                  },
                  description: 'The columns to include from the table.',
                },
              },
              description: 'A table to include in the view.',
            },
          },
        },
      },
    },
    async handler(ctx) {
      const { viewName, schemaName, viewTables } = ctx.input;
      const { connectionString } = options;
      const databaseService = new PostgreSQLDatabaseService(
        connectionString,
        ctx.logger,
      );

      try {
        await databaseService.createView(
          viewName as string,
          schemaName as string,
          viewTables as unknown as ViewTable[],
        );

        ctx.output('schemaName', schemaName);
        ctx.output('viewName', viewName);
      } catch (error) {
        ctx.logger.error('Error creating PostgreSQL view:', error);
        throw new Error(
          `Failed to create PostgreSQL view ${viewName} in schema ${schemaName}.`,
        );
      }

      ctx.logger.info(
        `PostgreSQL view ${schemaName}.${viewName} created successfully.`,
      );
    },
  });
}
