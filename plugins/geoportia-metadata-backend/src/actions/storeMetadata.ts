import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { stringifyEntityRef, parseEntityRef } from '@backstage/catalog-model';
import { InputError } from '@backstage/errors';
import { AuthService } from '@backstage/backend-plugin-api';
import { MetadataService } from '../services/MetadataService/MetadataService';
import { JsonObject } from '@backstage/types';

/**
 * Input options for the geoportia:metadata:store action.
 */
export interface StoreMetadataActionOptions {
  metadataService: MetadataService;
  auth?: AuthService;
}

export function createStoreMetadataAction(options: StoreMetadataActionOptions) {
  const { metadataService, auth } = options;

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
      const schema = ctx.input.schema as JsonObject;
      const metadata = ctx.input.metadata as JsonObject;

      ctx.logger.info(`Storing metadata for entityRef: ${entityRef}`);

      let parsedRef;
      try {
        parsedRef = parseEntityRef(entityRef);
      } catch (e) {
        throw new InputError(`Invalid entityRef format: ${entityRef}`);
      }

      const normalizedRef = stringifyEntityRef(parsedRef);

      if (!schema || typeof schema !== 'object') {
        throw new InputError('schema must be a valid JSON object');
      }
      if (!('type' in schema)) {
        throw new InputError('schema must have a "type" property');
      }

      if (!metadata || typeof metadata !== 'object') {
        throw new InputError('metadata must be a valid JSON object');
      }

      // Get credentials for the operation
      const credentials = auth 
        ? await auth.getOwnServiceCredentials()
        : { $$type: '@backstage/BackstageCredentials' as const, principal: { type: 'service' as const, subject: 'scaffolder' } };

      ctx.logger.info(`Storing metadata for ${normalizedRef}`);

      try {
        // Try to update first
        await metadataService.updateMetadataEntry(
          { entityRef: normalizedRef, schema, metadata },
          { credentials: credentials },
        );
        ctx.logger.info(`Updated existing metadata for ${normalizedRef}`);
      } catch (error) {
        // If not found, create new
        if (error instanceof Error && error.message.includes('not found')) {
          ctx.logger.info(`Creating new metadata entry for ${normalizedRef}`);
          await metadataService.createMetadataEntry(
            { entityRef: normalizedRef, schema, metadata },
            { credentials: credentials },
          );
          ctx.logger.info(`Created new metadata for ${normalizedRef}`);
        } else {
          throw error;
        }
      }

      ctx.output('entityRef', normalizedRef);

      ctx.logger.info(
        `Metadata stored for ${normalizedRef}; catalog will see it within ~5s via MetadataEntryProvider.`,
      );
    },
  });
}
