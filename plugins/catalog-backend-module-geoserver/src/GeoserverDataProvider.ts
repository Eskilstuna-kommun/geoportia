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
  Entity,
  CompoundEntityRef,
} from '@backstage/catalog-model';
import CryptoJS from 'crypto-js';

interface GeoserverStore {
  name: string;
  description: string;
  dependencies: CompoundEntityRef[];
}

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

  // Converts a string to a valid Backstage entity name
  convertNameToBackstageCompliant(name: string): string {
    return (
      `${name}`.substring(0, 58).replace(/[^a-zA-Z0-9._-]/g, '_') +
      '-' +
      CryptoJS.MD5(`${name}`).toString().substring(0, 4)
    );
  }

  // Converts a string to a valid Backstage namespace name
  convertNamespaceToBackstageCompliant(name: string): string {
    return (
      `${name}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .substring(0, 58) +
      '-' +
      CryptoJS.MD5(`${name}`).toString().substring(0, 4)
    );
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

        const geoserverStoresInWorkspace: GeoserverStore[] = [];
        const compliantWorkspaceName = this.convertNamespaceToBackstageCompliant(workspace.name);

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

              geoserverStoresInWorkspace.push({
                name: this.convertNameToBackstageCompliant(dataStore.name),
                description: fullDataStoreObject?.dataStore?.description ?? '',
                dependencies: [],
              });
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

              geoserverStoresInWorkspace.push({
                name: this.convertNameToBackstageCompliant(
                  coverageStore.name,
                ),
                description:
                  fullCoverageStoreObject?.covarageStore?.description ?? '',
                dependencies: [],
              });
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

              geoserverStoresInWorkspace.push({
                name: this.convertNameToBackstageCompliant(wmsStore.name),
                description: fullWmsStoreObject?.wmsStore?.description ?? '',
                dependencies: [],
              });
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

              geoserverStoresInWorkspace.push({
                name: this.convertNameToBackstageCompliant(wmtsStore.name),
                description: fullWmtsStoreObject?.wmtsStore?.description ?? '',
                dependencies: [],
              });
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

            const compliantLayerName = this.convertNameToBackstageCompliant(layer.name);

            entities.push({
              apiVersion: 'geoportia.se/v1alpha1',
              kind: 'GeoserverLayer',
              metadata: {
                name: compliantLayerName,
                namespace: compliantWorkspaceName,
                description: undefined,
                annotations: {
                  [ANNOTATION_LOCATION]: `url:${this.uri}`,
                  [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
                },
              },
              spec: {
                dependencyOf: [],
              },
            });

            try {
              const fullLayerObject = await grc.layers.get(
                workspace.name,
                layer.name,
              );

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

                      const dataStoreEntity = geoserverStoresInWorkspace.find(
                        store => store.name === this.convertNameToBackstageCompliant(dataStoreForLayer.name),
                      );

                      if (dataStoreEntity === undefined) {
                        this.logger.warn(
                          `Data store entity not found for layer ${layer.name}: ${dataStoreForLayer.name}`,
                        );
                      } else {
                        dataStoreEntity.dependencies.push({
                          kind: 'GeoserverLayer',
                          namespace: compliantWorkspaceName,
                          name: compliantLayerName,
                        });
                      }
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

                      const coverageStoreEntity =
                        geoserverStoresInWorkspace.find(
                          store => store.name === this.convertNameToBackstageCompliant(coverageStoreForLayer.name),
                        );

                      if (coverageStoreEntity === undefined) {
                        this.logger.warn(
                          `Coverage store entity not found for layer ${layer.name}: ${coverageStoreForLayer.name}`,
                        );
                      } else {
                        coverageStoreEntity.dependencies.push({
                          kind: 'GeoserverLayer',
                          namespace: compliantWorkspaceName,
                          name: compliantLayerName,
                        });
                      }
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

                      const wmsStoreEntity = geoserverStoresInWorkspace.find(
                        store => store.name === this.convertNameToBackstageCompliant(wmsStoreForLayer.name),
                      );

                      if (wmsStoreEntity === undefined) {
                        this.logger.warn(
                          `WMS store entity not found for layer ${layer.name}: ${wmsStoreForLayer.name}`,
                        );
                      } else {
                        wmsStoreEntity.dependencies.push({
                          kind: 'GeoserverLayer',
                          namespace: compliantWorkspaceName,
                          name: compliantLayerName,
                        });
                      }
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

                      const wmtsStoreEntity = geoserverStoresInWorkspace.find(
                        store => store.name === this.convertNameToBackstageCompliant(wmtsStoreForLayer.name),
                      );

                      if (wmtsStoreEntity === undefined) {
                        this.logger.warn(
                          `WMTS store entity not found for layer ${layer.name}: ${wmtsStoreForLayer.name}`,
                        );
                      } else {
                        wmtsStoreEntity.dependencies.push({
                          kind: 'GeoserverLayer',
                          namespace: compliantWorkspaceName,
                          name: compliantLayerName,
                        });
                      }
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

        // Now that all layers for the workspace have been processed, we can create the store entities with their dependencies
        for (const geoserverStore of geoserverStoresInWorkspace) {
          entities.push({
            apiVersion: 'geoportia.se/v1alpha1',
            kind: 'GeoserverStore',
            metadata: {
              name: geoserverStore.name,
              namespace: compliantWorkspaceName,
              description: `${geoserverStore.description}`,
              annotations: {
                [ANNOTATION_LOCATION]: `url:${this.uri}`,
                [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
              },
            },
            spec: {
              dependencyOf: geoserverStore.dependencies,
            },
          });
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
