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
          versioning: {
            type: 'string',
            enum: ['NONE', 'TRADITIONAL', 'BRANCH'],
            title: 'Versioning',
            description:
              'Register the dataset as traditional- or branch-versioned. Defaults to NONE.',
          },
          isTraditionalVersioned: {
            type: 'boolean',
            title: 'Is traditional-versioned',
            description:
              'Boolean equivalent of versioning=TRADITIONAL. Derived from the dropdown.',
          },
          isBranchVersioned: {
            type: 'boolean',
            title: 'Is branch-versioned',
            description:
              'Boolean equivalent of versioning=BRANCH. Derived from the dropdown.',
          },
          allowZValues: {
            type: 'boolean',
            title: 'Allow Z values',
            description:
              'Enable Z values on the dataset spatial reference.',
          },
          zExtent: {
            type: 'object',
            title: 'Z extent',
            description: 'Z domain (min/max) applied when allowZValues is true.',
            properties: {
              min: { type: 'number', title: 'Z min' },
              max: { type: 'number', title: 'Z max' },
            },
            required: ['min', 'max'],
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
      const versioning = ctx.input.versioning as
        | 'NONE'
        | 'TRADITIONAL'
        | 'BRANCH'
        | undefined;
      const isTraditionalVersioned = ctx.input.isTraditionalVersioned as
        | boolean
        | undefined;
      const isBranchVersioned = ctx.input.isBranchVersioned as
        | boolean
        | undefined;
      const allowZValues = ctx.input.allowZValues as boolean | undefined;
      const zExtent = ctx.input.zExtent as
        | { min: number; max: number }
        | undefined;

      ctx.logger.info(
        `Creating ArcGIS SDE dataset "${datasetName}" in database resource "${databaseResourceName}"`,
      );

      const result = await createArcgisSdeDataset(databases, {
        databaseResourceName,
        datasetName,
        spatialReferenceWkid,
        versioning,
        isTraditionalVersioned,
        isBranchVersioned,
        allowZValues,
        zExtent,
      });

      ctx.logger.info(
        `Created ArcGIS SDE dataset "${result.datasetName}" in database "${result.database}".`,
      );

      ctx.output('database', result.database);
      ctx.output('datasetName', result.datasetName);
    },
  });
}
