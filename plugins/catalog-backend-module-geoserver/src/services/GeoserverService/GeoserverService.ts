import { LoggerService } from '@backstage/backend-plugin-api';
import { GeoServerRestClient } from 'geoserver-rest-client';

export enum GeoserverStoreType {
  Datastore = 'DataStore',
  CoverageStore = 'CoverageStore',
  WMSStore = 'WMSStore',
  WMTSStore = 'WMTSStore',
}

export interface GeoserverLayer {
  name: string;
  workspace: string;
  datastore: string;
  nativeName: string;
  title?: string;
  srs?: string;
  enabled: string;
  abstract?: string;
  nativeBoundingBox?: string;
}

export class GeoserverService {
  constructor(
    private readonly logger: LoggerService,
    private readonly geoserverUri: string,
    private readonly geoserverUsername: string,
    private readonly geoserverPassword: string,
  ) {}

  async createLayer(
    layer: GeoserverLayer,
    storeType: GeoserverStoreType,
  ): Promise<void> {
    const geoserverRestClient = new GeoServerRestClient(
      this.geoserverUri,
      this.geoserverUsername,
      this.geoserverPassword,
    );

    try {
      switch (storeType) {
        case GeoserverStoreType.Datastore:
          await geoserverRestClient.layers.publishFeatureType(
            layer.workspace,
            layer.datastore,
            layer.nativeName,
            layer.name,
            layer.title,
            layer.srs,
            layer.enabled,
            layer.abstract,
            layer.nativeBoundingBox,
          );

          break;
        case GeoserverStoreType.CoverageStore:
          await geoserverRestClient.layers.publishDbRaster(
            layer.workspace,
            layer.datastore,
            layer.nativeName,
            layer.name,
            layer.title,
            layer.srs,
            layer.enabled,
            layer.abstract,
          );

          break;
        case GeoserverStoreType.WMSStore:
          await geoserverRestClient.layers.publishWmsLayer(
            layer.workspace,
            layer.datastore,
            layer.nativeName,
            layer.name,
            layer.title,
            layer.srs,
            layer.enabled,
            layer.abstract,
          );

          break;
        case GeoserverStoreType.WMTSStore:
          const body = {
            wmtssLayer: {
              name: layer.name || layer.nativeName,
              nativeName: layer.nativeName,
              title: layer.title || layer.name || layer.nativeName,
              srs: layer.srs || 'EPSG:4326',
              enabled: layer.enabled,
              abstract: layer.abstract || '',
            },
          };

          await fetch(
            this.geoserverUri +
              '/workspaces/' +
              layer.workspace +
              '/wmtsstores/' +
              layer.datastore +
              '/layers',
            {
              credentials: 'include',
              method: 'POST',
              headers: {
                Authorization:
                  'Basic ' +
                  Buffer.from(
                    this.geoserverUsername + ':' + this.geoserverPassword,
                  ).toString('base64'),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(body),
            },
          );

          break;

        default:
          throw new Error(`Unsupported store type: ${storeType}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to publish feature type layer ${layer.name} in workspace ${
          layer.workspace
        } and datastore ${layer.datastore} of type ${storeType}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }
}
