import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GeoserverLayer,
  GeoserverService,
  GeoserverStoreType,
} from '../services/GeoserverService/GeoserverService';

export interface CreateGeoserverLayerActionInput {
  geoserverService: GeoserverService;
}

export function createCreateGeoserverLayerAction(
  options: CreateGeoserverLayerActionInput,
) {
  return createTemplateAction({
    id: 'geoserver:create-layer',
    description: 'Creates a new layer in GeoServer',
    schema: {
      input: {
        type: 'object',
        required: [
          'name',
          'workspace',
          'datastore',
          'nativeName',
          'enabled',
          'storeType',
        ],
        properties: {
          name: {
            type: 'string',
            description: 'The name of the layer to create',
          },
          workspace: {
            type: 'string',
            description: 'The workspace where the layer will be created',
          },
          datastore: {
            type: 'string',
            description: 'The datastore where the layer will be created',
          },
          nativeName: {
            type: 'string',
            description: 'The native name of the layer',
          },
          title: {
            type: 'string',
            description: 'The title of the layer',
          },
          srs: {
            type: 'string',
            description: 'The spatial reference system of the layer',
          },
          enabled: {
            type: 'string',
            description: 'Whether the layer is enabled',
          },
          abstract: {
            type: 'string',
            description: 'The abstract of the layer',
          },
          nativeBoundingBox: {
            type: 'string',
            description: 'The native bounding box of the layer',
          },
          storeType: {
            type: 'string',
            description:
              'The type of the store where the layer will be created',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          layerId: {
            type: 'string',
            description: 'The ID of the created layer',
          },
        },
      },
    },
    async handler(ctx) {
      const {
        name,
        workspace,
        datastore,
        nativeName,
        title,
        srs,
        enabled,
        abstract,
        nativeBoundingBox,
        storeType,
      } = ctx.input;

      try {
        await options.geoserverService.createLayer(
          {
            name,
            workspace,
            datastore,
            nativeName,
            title,
            srs,
            enabled,
            abstract,
            nativeBoundingBox,
          } as GeoserverLayer,
          storeType as GeoserverStoreType,
        );
      } catch (error) {
        ctx.logger.error(
          `Error creating GeoServer layer: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        throw error;
      }

      ctx.logger.info(`Successfully created GeoServer layer "${name}"`);

      ctx.output('layer', name);
    },
  });
}
