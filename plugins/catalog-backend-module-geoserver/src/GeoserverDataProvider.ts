import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import {
  LoggerService,
  SchedulerServiceTaskRunner,
} from '@backstage/backend-plugin-api';
import { GeoServerRestClient } from 'geoserver-rest-client';
import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  RELATION_PART_OF,
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

  // Creates a new Geoserver data store entity
  private createStoreEntity(
    name: string,
    description: string,
    spec: any,
  ): Entity {
    return {
      apiVersion: 'geoportia.se/v1alpha1',
      kind: 'GeoserverStore',
      metadata: {
        name: `${name}`,
        namespace: 'default',
        description,
        annotations: {
          [ANNOTATION_LOCATION]: `url:${this.uri}`,
          [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
        },
      },
      spec,
    };
  }

  // Creates a custom property on a layer entity's spec object, to be read by the entity processor
  private addStoreToLayer(
    layer: Entity,
    storeName: string,
  ): void {
    if (layer.spec !== undefined) {
      layer.spec.store = {
        type: RELATION_PART_OF,
        targetRef: stringifyEntityRef({
          kind: 'GeoserverStore',
          namespace: 'default',
          name: `${storeName}`,
        }),
      };
    } else {
      this.logger.warn('Layer spec is undefined, cannot set store relation.');
    }
  }

  async run() {
    if (!this.connection) {
      throw new Error('Not initialized');
    }

    const grc = new GeoServerRestClient(this.uri, this.username, this.password);

    try {
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

        try {
          // Add data stores
          const dataStoresForWorkspaceObject =
            await grc.datastores.getDataStores(workspace.name);
          const dataStoresForWorkspace =
            dataStoresForWorkspaceObject?.dataStores?.dataStore;
          for (const dataStore of dataStoresForWorkspace || []) {
            this.logger.debug(
              `Found data store: ${dataStore.name} at ${dataStore.href} for workspace ${workspace.name}`,
            );

            try {
              const fullDataStoreObject = await grc.datastores.getDataStore(
                workspace.name,
                dataStore.name,
              );

              entities.push(
                this.createStoreEntity(
                  dataStore.name,
                  fullDataStoreObject?.dataStore?.description,
                  fullDataStoreObject?.dataStore || {},
                ),
              );
            } catch (error) {
              this.logger.warn(
                `Error fetching data store ${dataStore.name} for workspace ${workspace.name}: ${error}`,
              );
            }
          }
        } catch (error) {
          this.logger.warn(
            `Error fetching data stores for workspace ${workspace.name}: ${error}`,
          );
        }

        // Add coverage stores
        try {
          const coverageStoresForWorkspaceObject =
            await grc.datastores.getCoverageStores(workspace.name);
          const coverageStoresForWorkspace =
            coverageStoresForWorkspaceObject?.coverageStores?.coverageStore;
          for (const coverageStore of coverageStoresForWorkspace || []) {
            this.logger.debug(
              `Found coverage store: ${coverageStore.name} at ${coverageStore.href} for workspace ${workspace.name}`,
            );

            try {
              const fullCoverageStoreObject =
                await grc.datastores.getCoverageStore(
                  workspace.name,
                  coverageStore.name,
                );

              entities.push(
                this.createStoreEntity(
                  coverageStore.name,
                  fullCoverageStoreObject?.coverageStore?.description,
                  fullCoverageStoreObject?.coverageStore || {},
                ),
              );
            } catch (error) {
              this.logger.warn(
                `Error fetching coverage store ${coverageStore.name} for workspace ${workspace.name}: ${error}`,
              );
            }
          }
        } catch (error) {
          this.logger.warn(
            `Error fetching coverage stores for workspace ${workspace.name}: ${error}`,
          );
        }

        // Add WMS stores
        try {
          const wmsStoresForWorkspaceObject = await grc.datastores.getWmsStores(
            workspace.name,
          );
          const wmsStoresForWorkspace =
            wmsStoresForWorkspaceObject?.wmsStores?.wmsStore;
          for (const wmsStore of wmsStoresForWorkspace || []) {
            this.logger.debug(
              `Found WMS store: ${wmsStore.name} at ${wmsStore.href} for workspace ${workspace.name}`,
            );

            try {
              const fullWmsStoreObject = await grc.datastores.getWmsStore(
                workspace.name,
                wmsStore.name,
              );

              entities.push(
                this.createStoreEntity(
                  wmsStore.name,
                  fullWmsStoreObject?.wmsStore?.description,
                  fullWmsStoreObject?.wmsStore || {},
                ),
              );
            } catch (error) {
              this.logger.warn(
                `Error fetching WMS store ${wmsStore.name} for workspace ${workspace.name}: ${error}`,
              );
            }
          }
        } catch (error) {
          this.logger.warn(
            `Error fetching WMS stores for workspace ${workspace.name}: ${error}`,
          );
        }

        // Add WMTS stores
        try {
          const wmtsStoresForWorkspaceObject =
            await grc.datastores.getWmtsStores(workspace.name);
          const wmtsStoresForWorkspace =
            wmtsStoresForWorkspaceObject?.wmtStores?.wmtStore;
          for (const wmtsStore of wmtsStoresForWorkspace || []) {
            this.logger.debug(
              `Found WMTS store: ${wmtsStore.name} at ${wmtsStore.href} for workspace ${workspace.name}`,
            );

            try {
              const fullWmtsStoreObject = await grc.datastores.getWmtsStore(
                workspace.name,
                wmtsStore.name,
              );

              entities.push(
                this.createStoreEntity(
                  wmtsStore.name,
                  fullWmtsStoreObject?.wmtsStore?.description,
                  fullWmtsStoreObject?.wmtStore || {},
                ),
              );
            } catch (error) {
              this.logger.warn(
                `Error fetching WMTS store ${wmtsStore.name} for workspace ${workspace.name}: ${error}`,
              );
            }
          }
        } catch (error) {
          this.logger.warn(
            `Error fetching WMTS stores for workspace ${workspace.name}: ${error}`,
          );
        }

        // Add layers
        try {
          const layersObject = await grc.layers.getLayers(workspace.name);
          const layers = layersObject?.layers?.layer;

          if (layers === undefined || layers.length === 0) {
            this.logger.debug(
              `No layers found in workspace ${workspace.name}.`,
            );
          }

          for (const layer of layers || []) {
            this.logger.debug(
              `Found layer: ${layer.name} at ${layer.href} for workspace ${workspace.name}`,
            );

            try {
              const fullLayerObject = await grc.layers.get(
                workspace.name,
                layer.name,
              );

              const layerEntity: Entity = {
                apiVersion: 'geoportia.se/v1alpha1',
                kind: 'GeoserverLayer',
                metadata: {
                  name: `${layer.name}`,
                  namespace: 'default',
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
                    try {
                      const dataStoresForLayerObject =
                        await grc.layers.getDataStore(
                          workspace.name,
                          layer.name,
                        );
                      const dataStoreForLayer =
                        dataStoresForLayerObject?.dataStore;
                      this.logger.debug(
                        `Found data store: ${dataStoreForLayer.name} for layer ${layer.name}`,
                      );

                      this.addStoreToLayer(
                        layerEntity,
                        dataStoreForLayer.name,
                      );
                    } catch (error) {
                      this.logger.warn(
                        `Error fetching data store for layer ${layer.name} in workspace ${workspace.name}: ${error}`,
                      );
                    }

                    break;
                  case 'coverage':
                    try {
                      const coverageStoresForLayerObject =
                        await grc.layers.getCoverageStore(
                          workspace.name,
                          layer.name,
                        );
                      const coverageStoreForLayer =
                        coverageStoresForLayerObject?.coverageStore;
                      this.logger.debug(
                        `Found coverage store: ${coverageStoreForLayer.name} for layer ${layer.name}`,
                      );

                      this.addStoreToLayer(
                        layerEntity,
                        coverageStoreForLayer.name,
                      );
                    } catch (error) {
                      this.logger.warn(
                        `Error fetching coverage store for layer ${layer.name} in workspace ${workspace.name}: ${error}`,
                      );
                    }

                    break;

                  case 'wmsLayer':
                    try {
                      const wmsStoresForLayerObject =
                        await grc.layers.getWMSStore(
                          workspace.name,
                          layer.name,
                        );
                      const wmsStoreForLayer =
                        wmsStoresForLayerObject?.wmsStore;
                      this.logger.debug(
                        `Found WMS store: ${wmsStoreForLayer.name} for layer ${layer.name}`,
                      );

                      this.addStoreToLayer(
                        layerEntity,
                        wmsStoreForLayer.name,
                      );
                    } catch (error) {
                      this.logger.warn(
                        `Error fetching WMS store for layer ${layer.name} in workspace ${workspace.name}: ${error}`,
                      );
                    }

                    break;

                  case 'wmtsLayer':
                    try {
                      const wmtsStoresForLayerObject =
                        await grc.layers.getWMTSStore(
                          workspace.name,
                          layer.name,
                        );
                      const wmtsStoreForLayer =
                        wmtsStoresForLayerObject?.wmtsStore;
                      this.logger.debug(
                        `Found WMTS store: ${wmtsStoreForLayer.name} for layer ${layer.name}`,
                      );

                      this.addStoreToLayer(
                        layerEntity,
                        wmtsStoreForLayer.name,
                      );
                    } catch (error) {
                      this.logger.warn(
                        `Error fetching WMTS store for layer ${layer.name} in workspace ${workspace.name}: ${error}`,
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
            } catch (error) {
              this.logger.warn(
                `Error fetching layer ${layer.name} for workspace ${workspace.name}: ${error}`,
              );
            }
          }
        } catch (error) {
          this.logger.warn(
            `Error fetching layers for workspace ${workspace.name}: ${error}`,
          );
        }
      }

      await this.connection.applyMutation({
        type: 'full',
        entities: entities.map(entity => ({
          entity,
          locationKey: this.getProviderName(),
        })),
      });
    } catch (error) {
      this.logger.error(`Error fetching Geoserver workspaces: ${error}`);
      return;
    }
  }
}
