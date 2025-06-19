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
      this.logger.debug('No workspaces found in GeoServer.');
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

        // ToDo: create an entity for the data store
        // ToDo: add the data store entity to the entities array
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

        // ToDo: create an entity for the coveragestore
        // ToDo: add the coverage store entity to the entities array
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

        // ToDo: create an entity for the WMS store
        // ToDo: add the WMS stpre entity to the entities array
      }

      // Add WMT stores
      const wmtStoresForWorkspaceObject = await grc.datastores.getWmtsStores(
        workspace.name,
      );
      const wmtStoresForWorkspace =
        wmtStoresForWorkspaceObject?.wmtStores?.wmtStore;
      for (const wmtStore of wmtStoresForWorkspace || []) {
        this.logger.debug(
          `Found WMT store: ${wmtStore.name} at ${wmtStore.href} for workspace ${workspace.name}`,
        );

        // ToDo: create an entity for the WMT store
        // ToDo: add the WMT stpre entity to the entities array
      }

      const layersObject = await grc.layers.getLayers(workspace.name);
      const layers = layersObject?.layers?.layer;
      if (layers === undefined || layers.length === 0) {
        this.logger.debug(`No layers found in workspace ${workspace.name}.`);
      }

      for (const layer of layers || []) {
        this.logger.debug(
          `Found layer: ${layer.name} at ${layer.href} for workspace ${workspace.name}`,
        );

        const fullLayer = await grc.layers.get(workspace.name, layer.name);

        if (fullLayer && fullLayer.layer && fullLayer.layer.resource) {
          switch (fullLayer.layer.resource['@class']) {
            case 'featureType':
              const dataStoresForLayerObject = await grc.layers.getDataStore(
                workspace.name,
                layer.name,
              );
              const dataStoreForLayer = dataStoresForLayerObject?.dataStore;
              this.logger.debug(
                `Found data store: ${dataStoreForLayer.name} for layer ${layer.name}`,
              );

              //ToDo: create a relation on the layer entity for the data store

              break;
            case 'coverage':
              const coverageStoresForLayerObject = await grc.layers.getCoverageStore(
                workspace.name,
                layer.name,
              );
              const coverageStoreForLayer = coverageStoresForLayerObject?.coverageStore;
              this.logger.debug(
                `Found coverage store: ${coverageStoreForLayer.name} for layer ${layer.name}`,
              );

              //ToDo: create a relation on the layer entity for the data store

              break;
            default:
              this.logger.warn(
                `Unknown resource type for layer ${layer.name}: ${fullLayer.layer.resource['@class']}`,
              );
              break;
          }
        }
        else {
          this.logger.warn("Layer lacks a resource and no store can therefore be found: " + layer.name);
        }

        // ToDo: create an entity for the layer
        // ToDo: add the layer entity to the entities array
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
