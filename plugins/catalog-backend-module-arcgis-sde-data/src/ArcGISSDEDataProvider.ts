import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import {
  LoggerService,
  SchedulerServiceTaskRunner,
} from '@backstage/backend-plugin-api';
import { ArcGISSDEClient } from './ArcGISSDEClient';
import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  Entity,
} from '@backstage/catalog-model';

export class ArcGISSDEDataProvider implements EntityProvider {
  private connection?: EntityProviderConnection;

  constructor(
    private uri: string,
    private taskRunner: SchedulerServiceTaskRunner,
    private loggerService: LoggerService,
    private arcGISSDEClient: ArcGISSDEClient,
  ) {}

  getProviderName(): string {
    return `arcGIS-SDE-data-${this.uri}`;
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

    // this.loggerService.info(`Running ArcGISSDEDataProvider for ${this.uri}`);

    const entities: Entity[] = [];

    try {
      const featureClasses = await this.arcGISSDEClient.fetchFeatureClasses();

      for (const featureClass of featureClasses) {
        // this.loggerService.info(`Processing feature class: ${featureClass}`);

        const fields = await this.arcGISSDEClient.fetchFields(featureClass);

        for (const field of fields) {
          // this.loggerService.info(
          //   `Field: ${field.name}, Type: ${field.type}, Alias: ${field.aliasName}`,
          // );

          const ArcGISField: Entity = {
            apiVersion: 'geoportia.se/v1alpha1',
            kind: 'ArcGISFeatureClassField',
            metadata: {
              name:
                field.domain !== ''
                  ? `${field.domain}.${field.name}`
                  : field.name,
              title: field.name,
              description: undefined,
              annotations: {
                [ANNOTATION_LOCATION]: `url:${this.uri}`,
                [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
              },
            },
            spec: field as any,
          };

          entities.push(ArcGISField);
        }

        const ArcGISFeatureClassEntity: Entity = {
          apiVersion: 'geoportia.se/v1alpha1',
          kind: 'ArcGISFeatureClass',
          metadata: {
            name: featureClass,
            title: featureClass,
            description: undefined,
            annotations: {
              [ANNOTATION_LOCATION]: `url:${this.uri}`,
              [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
            },
          },
          spec: { fields: fields } as any,
        };
        entities.push(ArcGISFeatureClassEntity);
      }
    } catch (error) {
      this.loggerService.warn('Failed to fetch ArcGIS entities: ' + error);
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
