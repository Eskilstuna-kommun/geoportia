import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { InputError } from '@backstage/errors';
import { AuthService, PermissionsService } from '@backstage/backend-plugin-api';
import { databaseCreatePermission } from '@internal/backstage-plugin-geoportia-metadata-common';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { CatalogClient } from '@backstage/catalog-client';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import * as yaml from 'yaml';

/**
 * Path (relative to the backend working directory) of the YAML file that
 * stores the database Resource entities and is registered as a catalog
 * location in app-config.yaml.
 */
const DATABASES_YAML_RELATIVE_PATH = '../../examples/databases.yaml';

/**
 * Input options for the geoportia:database:create action.
 */
export interface CreateDatabaseActionOptions {
  catalogClient: CatalogClient;
  auth?: AuthService;
  permissions?: PermissionsService;
}

export function createCreateDatabaseAction(options: CreateDatabaseActionOptions) {
  const { auth, permissions } = options;

  return createTemplateAction({
    id: 'geoportia:database:create',
    description:
      'Creates a new database Resource entity in the Backstage catalog',
    schema: {
      input: {
        type: 'object',
        required: ['name', 'status'],
        properties: {
          name: {
            type: 'string',
            title: 'Namn',
            description: 'Namn på databasen',
          },
          description: {
            type: 'string',
            title: 'Beskrivning',
            description: 'Beskrivning av databasen',
          },
          hostName: {
            type: 'string',
            title: 'Host Name',
            description: 'Databasens värdnamn',
          },
          status: {
            type: 'string',
            title: 'Status',
            description: 'Status för databasen',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          entityRef: {
            type: 'string',
            title: 'Entity Reference',
            description: 'The entityRef of the created database resource',
          },
          catalogInfoUrl: {
            type: 'string',
            title: 'Catalog Info URL',
            description:
              'A file:// URL pointing to the databases.yaml that contains the new entity, suitable for catalog:register.',
          },
        },
      },
    },
    async handler(ctx) {
      const { name, description, hostName, status } = ctx.input as {
        name: string;
        description?: string;
        hostName?: string;
        status: string;
      };

      ctx.logger.info(`Creating database resource: ${name}`);

      // Only admins are allowed to create databases.
      if (permissions && auth) {
        const credentials = await auth.getOwnServiceCredentials();
        const decision = await permissions.authorize(
          [{ permission: databaseCreatePermission }],
          { credentials },
        );
        if (decision[0].result === AuthorizeResult.DENY) {
          throw new InputError(
            'You do not have permission to create databases. Only administrators can create database resources.',
          );
        }
      }

      // Generate a safe entity name from the display name
      const entityName = name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      if (!entityName) {
        throw new InputError('Name must contain at least one alphanumeric character');
      }

      // Build the catalog Resource entity
      const entity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Resource',
        metadata: {
          name: entityName,
          title: name,
          description: description || `${name} database`,
          tags: ['database'],
          annotations: {
            ...(hostName && { 'geoportia.se/host-name': hostName }),
            'geoportia.se/status': status,
          },
        },
        spec: {
          type: 'database',
          owner: 'group:default/geoportia-team',
        },
      };

      const targetPath = path.resolve(
        process.cwd(),
        DATABASES_YAML_RELATIVE_PATH,
      );

      try {
        let existing = '';
        try {
          existing = await fs.readFile(targetPath, 'utf8');
        } catch (e: any) {
          if (e?.code !== 'ENOENT') {
            throw e;
          }
        }

        const duplicateRegex = new RegExp(
          `^\\s*name:\\s*${entityName.replace(
            /[-/\\^$*+?.()|[\]{}]/g,
            '\\$&',
          )}\\s*$`,
          'm',
        );
        if (duplicateRegex.test(existing)) {
          throw new InputError(
            `A database resource with the name "${entityName}" already exists.`,
          );
        }

        const yamlDoc = yaml.stringify(entity);
        const trimmed = existing.trimEnd();
        const separator =
          trimmed.length === 0
            ? ''
            : trimmed.endsWith('---')
              ? '\n'
              : '\n---\n';
        const newContent = `${trimmed}${separator}${yamlDoc}`;

        await fs.writeFile(targetPath, newContent, 'utf8');

        const entityRef = stringifyEntityRef({
          kind: 'Resource',
          namespace: 'default',
          name: entityName,
        });

        ctx.logger.info(
          `Successfully wrote database resource ${entityRef} to ${targetPath}`,
        );
        ctx.output('entityRef', entityRef);
        ctx.output('catalogInfoUrl', pathToFileURL(targetPath).toString());
      } catch (error) {
        ctx.logger.error(`Failed to create database resource: ${error}`);
        if (error instanceof InputError) {
          throw error;
        }
        throw new InputError(
          `Failed to create database resource: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    },
  });
}
