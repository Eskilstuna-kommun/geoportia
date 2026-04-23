import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { stringifyEntityRef, parseEntityRef } from '@backstage/catalog-model';
import { InputError } from '@backstage/errors';
import { AuthService, DiscoveryService } from '@backstage/backend-plugin-api';

/**
 * Input options for the geoportia:metadata:store action.
 */
export interface StoreMetadataActionOptions {
  discovery: DiscoveryService;
  auth?: AuthService;
}

/**
 * Creates the `geoportia:metadata:store` scaffolder action.
 *
 * This action stores metadata with its schema in the database,
 * creating a MetadataEntry entity that can be linked to a table or dataset.
 */
export function createStoreMetadataAction(options: StoreMetadataActionOptions) {
  const { discovery, auth } = options;

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

      const baseUrl = await discovery.getBaseUrl('geoportia-metadata');

      let token: string | undefined;
      if (auth) {
        const tokenResponse = await auth.getPluginRequestToken({
          onBehalfOf: await auth.getOwnServiceCredentials(),
          targetPluginId: 'geoportia-metadata',
        });
        token = tokenResponse.token;
      }

      ctx.logger.info(`Storing metadata via API for ${normalizedRef}`);

      const encodedRef = encodeURIComponent(normalizedRef);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let response = await fetch(`${baseUrl}/${encodedRef}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ schema, metadata }),
      });

      if (response.status === 404) {
        ctx.logger.info(`Creating new metadata entry for ${normalizedRef}`);
        response = await fetch(`${baseUrl}/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ entityRef: normalizedRef, schema, metadata }),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new InputError(
          `Failed to store metadata: ${response.status} ${errorText}`,
        );
      }

      ctx.logger.info(`Successfully stored metadata for ${normalizedRef}`);

      ctx.output('entityRef', normalizedRef);
    },
  });
}
