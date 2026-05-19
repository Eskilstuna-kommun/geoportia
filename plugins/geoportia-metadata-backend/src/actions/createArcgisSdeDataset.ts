import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { InputError } from '@backstage/errors';

export interface ArcgisSdeDatabaseConfig {
  proxyUri: string;
  database: string;
  adminUser: string;
  adminPassword: string;
  defaultSpatialReferenceWkid?: number;
}

export interface CreateArcgisSdeDatasetActionOptions {
  databases: Record<string, ArcgisSdeDatabaseConfig>;
}

interface CreateDatasetResponse {
  success: boolean;
  message?: string;
}

const NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]{0,159}$/;

function assertName(name: string, what: string): void {
  if (!NAME_REGEX.test(name)) {
    throw new InputError(
      `${what} "${name}" is not a valid ArcGIS SDE name ` +
        `(letters, digits and underscores only, must start with a letter or underscore).`,
    );
  }
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

      const dbConfig = databases[databaseResourceName];
      if (!dbConfig) {
        throw new InputError(
          `No ArcGIS SDE database resource configured with name "${databaseResourceName}". ` +
            `Configured: [${Object.keys(databases).join(', ')}]`,
        );
      }

      const {
        proxyUri,
        database: sdeDatabase,
        adminUser,
        adminPassword,
        defaultSpatialReferenceWkid,
      } = dbConfig;

      const spatialReferenceWkid =
        (ctx.input.spatialReferenceWkid as number | undefined) ??
        defaultSpatialReferenceWkid;

      assertName(sdeDatabase, 'database');
      assertName(datasetName, 'datasetName');

      ctx.logger.info(
        `Creating ArcGIS SDE dataset "${datasetName}" in database resource "${databaseResourceName}" (SDE db: "${sdeDatabase}")`,
      );

      const url = `${proxyUri.replace(/\/$/, '')}/create-dataset`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: sdeDatabase,
          datasetName,
          spatialReferenceWkid,
          adminUser,
          adminPassword,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
          `ArcGIS SDE proxy returned HTTP ${response.status} ${response.statusText}: ${text}`,
        );
      }

      const body = (await response.json()) as CreateDatasetResponse;
      if (!body.success) {
        throw new Error(
          `Failed to create ArcGIS SDE dataset "${datasetName}" in "${sdeDatabase}": ${
            body.message ?? 'unknown error'
          }`,
        );
      }

      ctx.logger.info(
        `Created ArcGIS SDE dataset "${datasetName}" in database "${sdeDatabase}".`,
      );

      ctx.output('database', databaseResourceName);
      ctx.output('datasetName', datasetName);
    },
  });
}
