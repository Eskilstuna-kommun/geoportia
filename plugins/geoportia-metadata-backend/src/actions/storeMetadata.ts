import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Knex } from 'knex';
import { stringifyEntityRef, parseEntityRef } from '@backstage/catalog-model';
import { InputError } from '@backstage/errors';
import { CatalogClient } from '@backstage/catalog-client';
import { AuthService } from '@backstage/backend-plugin-api';
import { TableRow } from '../database';

/**
 * Input options for the geoportia:metadata:store action.
 */
export interface StoreMetadataActionOptions {
  database: Knex;
  catalogApi?: CatalogClient;
  auth?: AuthService;
}

/**
 * Creates the `geoportia:metadata:store` scaffolder action.
 *
 * This action stores metadata with its schema in the database,
 * creating a MetadataEntry entity that can be linked to a table or dataset.
 */
export function createStoreMetadataAction(options: StoreMetadataActionOptions) {
  const { database, catalogApi, auth } = options;

  return createTemplateAction({
    id: 'geoportia:metadata:store',
    description: 'Stores metadata with schema in the Geoportia database',
    schema: {
      input: {
        type: 'object',
        required: ['entityRef', 'schema', 'metadata'],
        properties: {
          entityRef: {
            type: 'string',
            title: 'Entity Reference',
            description:
              'The entityRef for the MetadataEntry entity (e.g., metadataentry:default/my-metadata)',
          },
          schema: {
            type: 'object',
            title: 'JSON Schema',
            description: 'The JSON Schema that defines the metadata structure',
          },
          metadata: {
            type: 'object',
            title: 'Metadata',
            description: 'The actual metadata values conforming to the schema',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          entityRef: {
            type: 'string',
            title: 'Entity Reference',
            description: 'The entityRef of the created MetadataEntry',
          },
        },
      },
    },
    async handler(ctx) {
      const entityRef = ctx.input.entityRef as string;
      const schema = ctx.input.schema as Record<string, unknown>;
      const metadata = ctx.input.metadata as Record<string, unknown>;

      ctx.logger.info(`Storing metadata for entityRef: ${entityRef}`);

      // Validate the entityRef format
      let parsedRef;
      try {
        parsedRef = parseEntityRef(entityRef);
      } catch (e) {
        throw new InputError(`Invalid entityRef format: ${entityRef}`);
      }

      // Normalize the entityRef
      const normalizedRef = stringifyEntityRef(parsedRef);

      // Validate that schema is a valid JSON Schema (basic check)
      if (!schema || typeof schema !== 'object') {
        throw new InputError('schema must be a valid JSON object');
      }
      if (!('type' in schema)) {
        throw new InputError('schema must have a "type" property');
      }

      // Validate that metadata is an object
      if (!metadata || typeof metadata !== 'object') {
        throw new InputError('metadata must be a valid JSON object');
      }

      // Store in database
      await database.transaction(async db => {
        // Check if entry already exists
        const existing = await db<TableRow>('geoportia_metadata')
          .where({ entity_ref: normalizedRef })
          .first();

        if (existing) {
          // Update existing entry
          ctx.logger.info(`Updating existing metadata for ${normalizedRef}`);
          await db<TableRow>('geoportia_metadata')
            .where({ entity_ref: normalizedRef })
            .update({
              schema: schema,
              metadata: metadata,
            });
        } else {
          // Insert new entry
          ctx.logger.info(`Creating new metadata entry for ${normalizedRef}`);
          await db<TableRow>('geoportia_metadata').insert({
            entity_ref: normalizedRef,
            schema: schema,
            metadata: metadata,
          });
        }
      });

      // Trigger catalog refresh if available
      if (catalogApi && auth) {
        try {
          const token = await auth.getPluginRequestToken({
            onBehalfOf: await auth.getOwnServiceCredentials(),
            targetPluginId: 'catalog',
          });
          await (catalogApi as any).refreshEntity(normalizedRef, { token });
          ctx.logger.info(`Triggered catalog refresh for ${normalizedRef}`);
        } catch (e) {
          ctx.logger.warn(`Failed to refresh catalog entity: ${e}`);
        }
      }

      ctx.logger.info(`Successfully stored metadata for ${normalizedRef}`);

      ctx.output('entityRef', normalizedRef);
    },
  });
}
