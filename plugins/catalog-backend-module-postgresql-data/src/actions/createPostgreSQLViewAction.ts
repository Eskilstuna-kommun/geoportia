import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  PostgreSQLDatabaseService,
  ViewTable,
} from '../services/PostgreSQLDatabaseService';

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
        required: ['distributionName', 'tableName', 'whereClause'],
        properties: {
          distributionName: {
            type: 'string',
            title: 'Distribution Name',
          },
          tableName: {
            type: 'string',
            title: 'Table Name',
          },
          whereClause: {
            type: 'string',
            title: 'WHERE Clause',
          },
        },
      },
    },
    async handler(ctx) {
      const { distributionName, tableName, whereClause } = ctx.input;
      const { connectionString } = options;
      const databaseService = new PostgreSQLDatabaseService(
        connectionString,
        ctx.logger,
      );

      try {
        await databaseService.createViewFromQuery(
          distributionName as string,
          tableName as string,
          whereClause as string,
        );

        ctx.output('distributionName', distributionName);
        ctx.output('tableName', tableName);
        ctx.output('whereClause', whereClause);
      } catch (error) {
        ctx.logger.error('Error creating PostgreSQL view:', error);
        throw new Error(
          `Failed to create PostgreSQL view ${distributionName}_view.`,
        );
      }

      ctx.logger.info(
        `PostgreSQL view ${distributionName}_view created successfully.`,
      );
    },
  });
}
