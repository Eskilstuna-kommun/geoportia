import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import {
  LoggerService,
  SchedulerServiceTaskRunner,
} from '@backstage/backend-plugin-api';
// @ts-ignore
import { GeoServerRestClient } from 'geoserver-rest-client';
import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  Entity,
  stringifyEntityRef,
} from '@backstage/catalog-model';

export class GeoserverDataProvider implements EntityProvider {
  private connection?: EntityProviderConnection;

  constructor(
    private uri: string,
    private username: string,
    private password: string,
    private taskRunner: SchedulerServiceTaskRunner,
    private logger: LoggerService,
  ) {}

  getProviderName(): string {
    return `geoserver-data-${this.uri}`;
  }

  async connect(connection: EntityProviderConnection) {
    this.connection = connection;

    await this.taskRunner.run({
      id: this.getProviderName(),
      fn: async () => {
        await this.run();
      },
    });
    await this.run();
  }

  async run() {
    if (!this.connection) {
      throw new Error('Not initialized');
    }

    const grc = new GeoServerRestClient(this.uri, this.username, this.password);

    const workspacesObject = await grc.workspaces.getAll();
    const workspaces = workspacesObject?.workspaces?.workspace;

    if (workspaces === undefined || workspaces.length === 0) {
      this.logger.info(
        'No workspaces found in GeoServer. No Geoserver entities will be created.',
      );
      return;
    }

    const entities: Entity[] = [];

    for (const workspace of workspaces || []) {
      this.logger.debug(
        `Found GeoServer workspace: ${workspace.name} at ${workspace.href}`,
      );

      // Add data stores
      const dataStoresForWorkspaceObject = await grc.datastores.getDataStores(
        workspace.name,
      );
      const dataStoresForWorkspace =
        dataStoresForWorkspaceObject?.dataStores?.dataStore;
      for (const dataStore of dataStoresForWorkspace || []) {
        this.logger.debug(
          `Found data store: ${dataStore.name} at ${dataStore.href} for workspace ${workspace.name}`,
        );

        const fullDataStoreObject = await grc.datastores.getDataStore(
          workspace.name,
          dataStore.name,
        );

        const dataStoreEntity: Entity = {
          apiVersion: 'geoportia.se/v1alpha1',
          kind: 'GeoserverStore',
          metadata: {
            name: dataStore.name,
            namespace: workspace.name,
            description: fullDataStoreObject?.dataStore?.description,
            annotations: {
              [ANNOTATION_LOCATION]: `url:${this.uri}`,
              [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
            },
          },
          spec: fullDataStoreObject?.dataStore || {},
        };

        entities.push(dataStoreEntity);
      }

      // Add coverage stores
      const coverageStoresForWorkspaceObject =
        await grc.datastores.getCoverageStores(workspace.name);
      const coverageStoresForWorkspace =
        coverageStoresForWorkspaceObject?.coverageStores?.coverageStore;
      for (const coverageStore of coverageStoresForWorkspace || []) {
        this.logger.debug(
          `Found coverage store: ${coverageStore.name} at ${coverageStore.href} for workspace ${workspace.name}`,
        );

        const fullCoverageStoreObject = await grc.datastores.getCoverageStore(
          workspace.name,
          coverageStore.name,
        );

        const coverageStoreEntity: Entity = {
          apiVersion: 'geoportia.se/v1alpha1',
          kind: 'GeoserverStore',
          metadata: {
            name: coverageStore.name,
            namespace: workspace.name,
            description: fullCoverageStoreObject?.coverageStore?.description,
            annotations: {
              [ANNOTATION_LOCATION]: `url:${this.uri}`,
              [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
            },
          },
          spec: fullCoverageStoreObject?.coverageStore || {},
        };
        entities.push(coverageStoreEntity);
      }

      // Add WMS stores
      const wmsStoresForWorkspaceObject = await grc.datastores.getWmsStores(
        workspace.name,
      );
      const wmsStoresForWorkspace =
        wmsStoresForWorkspaceObject?.wmsStores?.wmsStore;
      for (const wmsStore of wmsStoresForWorkspace || []) {
        this.logger.debug(
          `Found WMS store: ${wmsStore.name} at ${wmsStore.href} for workspace ${workspace.name}`,
        );

        const fullWmsStoreObject = await grc.datastores.getWmsStore(
          workspace.name,
          wmsStore.name,
        );

        const wmsStoreEntity: Entity = {
          apiVersion: 'geoportia.se/v1alpha1',
          kind: 'GeoserverStore',
          metadata: {
            name: wmsStore.name,
            namespace: workspace.name,
            description: fullWmsStoreObject?.wmsStore?.description,
            annotations: {
              [ANNOTATION_LOCATION]: `url:${this.uri}`,
              [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
            },
          },
          spec: fullWmsStoreObject?.wmsStore || {},
        };
        entities.push(wmsStoreEntity);
      }

      // Add WMTS stores
      const wmtsStoresForWorkspaceObject = await grc.datastores.getWmtsStores(
        workspace.name,
      );
      const wmtsStoresForWorkspace =
        wmtsStoresForWorkspaceObject?.wmtStores?.wmtStore;
      for (const wmtsStore of wmtsStoresForWorkspace || []) {
        this.logger.debug(
          `Found WMT store: ${wmtsStore.name} at ${wmtsStore.href} for workspace ${workspace.name}`,
        );

        const fullWmtsStoreObject = await grc.datastores.getWmtsStore(
          workspace.name,
          wmtsStore.name,
        );

        const wmtsStoreEntity: Entity = {
          apiVersion: 'geoportia.se/v1alpha1',
          kind: 'GeoserverStore',
          metadata: {
            name: wmtsStore.name,
            namespace: workspace.name,
            description: fullWmtsStoreObject?.wmtsStore?.description,
            annotations: {
              [ANNOTATION_LOCATION]: `url:${this.uri}`,
              [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
            },
          },
          spec: fullWmtsStoreObject?.wmtStore || {},
        };
        entities.push(wmtsStoreEntity);
      }

      // Add layers
      const layersObject = await grc.layers.getLayers(workspace.name);
      const layers = layersObject?.layers?.layer;
      if (layers === undefined || layers.length === 0) {
        this.logger.debug(`No layers found in workspace ${workspace.name}.`);
      }

      for (const layer of layers || []) {
        this.logger.debug(
          `Found layer: ${layer.name} at ${layer.href} for workspace ${workspace.name}`,
        );

        const fullLayerObject = await grc.layers.get(
          workspace.name,
          layer.name,
        );

        const layerEntity: Entity = {
          apiVersion: 'geoportia.se/v1alpha1',
          kind: 'GeoserverLayer',
          metadata: {
            name: layer.name,
            namespace: workspace.name,
            description: undefined,
            annotations: {
              [ANNOTATION_LOCATION]: `url:${this.uri}`,
              [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
            },
          },
          spec: fullLayerObject?.layer ? fullLayerObject.layer : {},
        };

        if (
          fullLayerObject &&
          fullLayerObject.layer &&
          fullLayerObject.layer.resource
        ) {
          switch (fullLayerObject.layer.resource['@class']) {
            case 'featureType':
              const dataStoresForLayerObject = await grc.layers.getDataStore(
                workspace.name,
                layer.name,
              );
              const dataStoreForLayer = dataStoresForLayerObject?.dataStore;
              this.logger.debug(
                `Found data store: ${dataStoreForLayer.name} for layer ${layer.name}`,
              );

              if (layerEntity.spec !== undefined) {
                layerEntity.spec.store = {
                  type: 'partOf',
                  targetRef: stringifyEntityRef({
                    kind: 'GeoserverStore',
                    namespace: workspace.name,
                    name: dataStoreForLayer.name,
                  }),
                };
              } else {
                this.logger.warn(
                  'Layer spec is undefined, cannot set store relation.',
                );
              }

              break;
            case 'coverage':
              const coverageStoresForLayerObject =
                await grc.layers.getCoverageStore(workspace.name, layer.name);
              const coverageStoreForLayer =
                coverageStoresForLayerObject?.coverageStore;
              this.logger.debug(
                `Found coverage store: ${coverageStoreForLayer.name} for layer ${layer.name}`,
              );

              if (layerEntity.spec !== undefined) {
                layerEntity.spec.store = {
                  type: 'partOf',
                  targetRef: stringifyEntityRef({
                    kind: 'GeoserverStore',
                    namespace: workspace.name,
                    name: coverageStoreForLayer.name,
                  }),
                };
              } else {
                this.logger.warn(
                  'Layer spec is undefined, cannot set store relation.',
                );
              }

              break;
            default:
              this.logger.warn(
                `Unknown resource type for layer ${layer.name}: ${fullLayerObject.layer.resource['@class']}`,
              );
              break;
          }
        } else {
          this.logger.warn(
            `Layer ${layer.name} lacks a resource and no store can therefore be found.`,
          );
        }

        entities.push(layerEntity);
      }
    }

    await this.connection.applyMutation({
      type: 'full',
      entities: entities.map(entity => ({
        entity,
        locationKey: this.getProviderName(),
      })),
    });
  }
}
