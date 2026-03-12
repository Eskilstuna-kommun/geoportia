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
import { createHash } from 'node:crypto';

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

  private convertNameToBackstageCompliant(name: string): string {
    const normalizedName = `${name ?? ''}`;
    const shortHash = createHash('md5')
      .update(normalizedName, 'utf8')
      .digest('hex')
      .substring(0, 4);

    return (
      normalizedName.substring(0, 58).replace(/[^a-zA-Z0-9._-]/g, '_') +
      '-' +
      shortHash
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

  // Creates a new Geoserver data store entity
  private createStoreEntity(
    name: string,
    workspace: string,
    description: string,
    spec: any,
  ): Entity {
    return {
      apiVersion: 'geoportia.se/v1alpha1',
      kind: 'GeoserverStore',
      metadata: {
        name,
        title: this.convertNameToBackstageCompliant(`${workspace}.${name}`),
        namespace: workspace,
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
    workspaceName: string,
    storeName: string,
  ): void {
    if (layer.spec !== undefined) {
      layer.spec.store = {
        type: RELATION_PART_OF,
        targetRef: stringifyEntityRef({
          kind: 'GeoserverStore',
          namespace: workspaceName,
          name: storeName,
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

        entities.push(
          this.createStoreEntity(
            dataStore.name,
            workspace.name,
            fullDataStoreObject?.dataStore?.description,
            fullDataStoreObject?.dataStore || {},
          ),
        );
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

        entities.push(
          this.createStoreEntity(
            coverageStore.name,
            workspace.name,
            fullCoverageStoreObject?.coverageStore?.description,
            fullCoverageStoreObject?.coverageStore || {},
          ),
        );
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

        entities.push(
          this.createStoreEntity(
            wmsStore.name,
            workspace.name,
            fullWmsStoreObject?.wmsStore?.description,
            fullWmsStoreObject?.wmsStore || {},
          ),
        );
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

        entities.push(
          this.createStoreEntity(
            wmtsStore.name,
            workspace.name,
            fullWmtsStoreObject?.wmtsStore?.description,
            fullWmtsStoreObject?.wmtStore || {},
          ),
        );
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
            title: this.convertNameToBackstageCompliant(
              `${workspace.name}.${layer.name}`,
            ),
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

              this.addStoreToLayer(
                layerEntity,
                workspace.name,
                dataStoreForLayer.name,
              );

              break;
            case 'coverage':
              const coverageStoresForLayerObject =
                await grc.layers.getCoverageStore(workspace.name, layer.name);
              const coverageStoreForLayer =
                coverageStoresForLayerObject?.coverageStore;
              this.logger.debug(
                `Found coverage store: ${coverageStoreForLayer.name} for layer ${layer.name}`,
              );

              this.addStoreToLayer(
                layerEntity,
                workspace.name,
                coverageStoreForLayer.name,
              );

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
