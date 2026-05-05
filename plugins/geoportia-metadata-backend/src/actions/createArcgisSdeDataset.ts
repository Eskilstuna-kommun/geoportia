import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { InputError } from '@backstage/errors';

export interface CreateArcgisSdeDatasetActionOptions {
  proxyUri: string;
  defaultDatabase?: string;
  adminUser: string;
  adminPassword: string;
  defaultSpatialReferenceWkid?: number;
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
  const {
    proxyUri,
    defaultDatabase,
    adminUser,
    adminPassword,
    defaultSpatialReferenceWkid,
  } = options;

  return createTemplateAction({
    id: 'geoportia:arcgis-sde:create-dataset',
    description:
      'Creates a new feature dataset in an ArcGIS SDE database via the python proxy.',
    schema: {
      input: {
        type: 'object',
        required: ['datasetName'],
        properties: {
          database: {
            type: 'string',
            title: 'Database',
            description:
              'Name of the ArcGIS SDE database. Defaults to the configured database.',
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
      const datasetName = (ctx.input.datasetName as string).trim();
      const database = ((ctx.input.database as string | undefined) ?? defaultDatabase)?.trim();
      const spatialReferenceWkid =
        (ctx.input.spatialReferenceWkid as number | undefined) ??
        defaultSpatialReferenceWkid;

      if (!database) {
        throw new InputError(
          'No database supplied and no default database configured for the ArcGIS SDE action.',
        );
      }

      assertName(database, 'database');
      assertName(datasetName, 'datasetName');

      ctx.logger.info(
        `Creating ArcGIS SDE dataset "${datasetName}" in database "${database}"`,
      );

      const url = `${proxyUri.replace(/\/$/, '')}/create-dataset`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database,
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
          `Failed to create ArcGIS SDE dataset "${datasetName}" in "${database}": ${
            body.message ?? 'unknown error'
          }`,
        );
      }

      ctx.logger.info(
        `Created ArcGIS SDE dataset "${datasetName}" in database "${database}".`,
      );

      ctx.output('database', database);
      ctx.output('datasetName', datasetName);
    },
  });
}
