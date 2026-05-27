import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  ArcgisSdeDatabaseConfig,
  createArcgisSdeDataset,
} from '../arcgisSde/arcgisSdeConfig';

export type { ArcgisSdeDatabaseConfig } from '../arcgisSde/arcgisSdeConfig';

export interface CreateArcgisSdeDatasetActionOptions {
  databases: Record<string, ArcgisSdeDatabaseConfig>;
}

export function createCreateArcgisSdeDatasetAction(
  options: CreateArcgisSdeDatasetActionOptions,
) {
  const { databases } = options;

  return createTemplateAction({
    id: 'geoportia:arcgis-sde:create-dataset',
    description:
      'Creates a new feature dataset in an ArcGIS SDE database via the python proxy.',
    schema: {
      input: {
        type: 'object',
        required: ['database', 'datasetName'],
        properties: {
          database: {
            type: 'string',
            title: 'Database',
            description:
              'metadata.name of the ArcGIS SDE Resource entity to create the dataset in.',
          },
          datasetName: {
            type: 'string',
            title: 'Dataset name',
            description: 'Name of the feature dataset to create.',
          },
          spatialReferenceWkid: {
            type: 'number',
            title: 'Spatial reference WKID',
            description:
              'WKID of the spatial reference for the new dataset (e.g. 3006).',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          database: { type: 'string', title: 'Database' },
          datasetName: { type: 'string', title: 'Dataset name' },
        },
      },
    },
    async handler(ctx) {
      const databaseResourceName = (ctx.input.database as string).trim();
      const datasetName = (ctx.input.datasetName as string).trim();
      const spatialReferenceWkid = ctx.input.spatialReferenceWkid as
        | number
        | undefined;

      ctx.logger.info(
        `Creating ArcGIS SDE dataset "${datasetName}" in database resource "${databaseResourceName}"`,
      );

      const result = await createArcgisSdeDataset(databases, {
        databaseResourceName,
        datasetName,
        spatialReferenceWkid,
      });

      ctx.logger.info(
        `Created ArcGIS SDE dataset "${result.datasetName}" in database "${result.database}".`,
      );

      ctx.output('database', result.database);
      ctx.output('datasetName', result.datasetName);
    },
  });
}
