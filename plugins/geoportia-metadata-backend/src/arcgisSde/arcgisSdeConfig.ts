import { Config } from '@backstage/config';
import { InputError, NotFoundError } from '@backstage/errors';


export interface ArcgisSdeDatabaseConfig {
  proxyUri: string;
  database: string;
  adminUser: string;
  adminPassword: string;
  defaultSpatialReferenceWkid?: number;
}

export type ArcgisSdeDatabases = Record<string, ArcgisSdeDatabaseConfig>;

export function loadArcgisSdeDatabases(rootConfig: Config): ArcgisSdeDatabases {
  const providersConfig = rootConfig.getOptionalConfig(
    'catalog.providers.arcgissde',
  );
  if (!providersConfig) {
    return {};
  }
  const databases: ArcgisSdeDatabases = {};
  for (const databaseName of providersConfig.keys()) {
    const dbCfg = providersConfig.getConfig(databaseName);
    databases[databaseName] = {
      proxyUri: dbCfg.getString('proxyUri'),
      database: dbCfg.getString('database'),
      adminUser: dbCfg.getString('adminUser'),
      adminPassword: dbCfg.getString('adminPassword'),
      defaultSpatialReferenceWkid: dbCfg.getOptionalNumber(
        'defaultSpatialReferenceWkid',
      ),
    };
  }
  return databases;
}

const NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]{0,159}$/;

function assertSdeName(name: string, what: string): void {
  if (!NAME_REGEX.test(name)) {
    throw new InputError(
      `${what} "${name}" is not a valid ArcGIS SDE name ` +
        `(letters, digits and underscores only, must start with a letter or underscore).`,
    );
  }
}

/**
 * Calls the python SDE proxy `/create-dataset` endpoint using the admin
 * credentials configured for the given database resource. Mirrors the
 * `geoportia:arcgis-sde:create-dataset` scaffolder action so the modal
 * widget in the UI and template-based flows produce identical results.
 */
export async function createArcgisSdeDataset(
  databases: ArcgisSdeDatabases,
  params: {
    databaseResourceName: string;
    datasetName: string;
    spatialReferenceWkid?: number;
  },
): Promise<{ database: string; datasetName: string }> {
  const databaseResourceName = params.databaseResourceName.trim();
  const datasetName = params.datasetName.trim();

  const dbConfig = databases[databaseResourceName];
  if (!dbConfig) {
    throw new NotFoundError(
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
    params.spatialReferenceWkid ?? defaultSpatialReferenceWkid;

  assertSdeName(sdeDatabase, 'database');
  assertSdeName(datasetName, 'datasetName');

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

  const body = (await response.json()) as {
    success: boolean;
    message?: string;
  };
  if (!body.success) {
    throw new Error(
      `Failed to create ArcGIS SDE dataset "${datasetName}" in "${sdeDatabase}": ${
        body.message ?? 'unknown error'
      }`,
    );
  }

  return { database: databaseResourceName, datasetName };
}
