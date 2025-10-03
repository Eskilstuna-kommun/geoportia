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
  CompoundEntityRef,
  Entity,
} from '@backstage/catalog-model';
import {
  ArcGISDomainValue,
  ArcGISFeatureClassField,
  ArcGISSDEDomainEntity,
  ArcGISSDEDomainValueEntity,
  ArcGISSDEFeatureClassEntity,
  ArcGISSDEFeatureClassFieldEntity,
} from '../../arcgis-sde-data-common/src';

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

  featureClassFieldToDependency(
    field: ArcGISFeatureClassField,
  ): CompoundEntityRef {
    return {
      kind: 'Field',
      namespace: field.domain !== '' ? field.domain : 'default',
      name: field.name,
    };
  }

  domainValueToDependency(
    value: ArcGISDomainValue,
    domain: string,
  ): CompoundEntityRef {
    return {
      kind: 'Field',
      namespace: 'default',
      name: `${domain}.${value.code.toString()}`,
    };
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

    const entities: Entity[] = [];

    try {
      const featureClasses =
        (await this.arcGISSDEClient.fetchFeatureClasses()) ?? [];

      for (const featureClass of featureClasses) {
        const featureClassParts = featureClass.split('.');

        if (featureClassParts.length > 2 ) {
          this.loggerService.warn(
            `Unexpected feature class name format: ${featureClass}. Skipping.`,
          );
          continue;
        }

        // If there are two parts in the feature class name, the first is the namespace (schema), the second is the feature class name proper
        const namespace = featureClassParts.length === 2 ? featureClassParts[0] : '';
        const featureClassName =
          featureClassParts.length === 2
            ? featureClassParts[1]
            : featureClassParts[0];        

        this.loggerService.info("Processing feature class: " + featureClassName + " in namespace: " + namespace);

        let fields
        try {
          fields = await this.arcGISSDEClient.fetchFields(featureClassName);
        } catch (error) {
          this.loggerService.warn(
            `Failed to fetch fields for feature class ${featureClassName}: ${error}. Skipping.`,
          );
          continue;
        }

        for (const field of fields) {
          const ArcGISField: ArcGISSDEFeatureClassFieldEntity = {
            apiVersion: 'geoportia.se/v1alpha1',
            kind: 'Field',
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
            spec: {
              dialect: 'arcgis',
              dependencyOf: [],
            } as any,
          };

          entities.push(ArcGISField);
        }

        const ArcGISFeatureClassEntity: ArcGISSDEFeatureClassEntity = {
          apiVersion: 'geoportia.se/v1alpha1',
          kind: 'Table',
          metadata: {
            name:
              namespace !== ''
                ? `${namespace}.${featureClassName}`
                : featureClassName,
            title: featureClassName,
            description: undefined,
            annotations: {
              [ANNOTATION_LOCATION]: `url:${this.uri}`,
              [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
            },
          },
          spec: {
            dialect: 'arcgis',
            dependencyOf: fields.map(this.featureClassFieldToDependency),
          } as any,
        };
        entities.push(ArcGISFeatureClassEntity);
      }

      const domains = (await this.arcGISSDEClient.fetchDomains()) ?? [];

      for (const domain of domains) {
        const domainValues =
          (await this.arcGISSDEClient.fetchDomainValues(domain.name)) ?? [];

        for (const domainValue of domainValues) {
          const ArcGISDomainValueEntity: ArcGISSDEDomainValueEntity = {
            apiVersion: 'geoportia.se/v1alpha1',
            kind: 'Field',
            metadata: {
              name: `${domain.name}.${domainValue.code.toString()}`,
              title: `${domain.name}.${domainValue.code.toString()}`,
              description: domainValue.description,
              annotations: {
                [ANNOTATION_LOCATION]: `url:${this.uri}`,
                [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
              },
            },
            spec: {
              dialect: 'arcgis',
              dependencyOf: [],
            } as any,
          };

          entities.push(ArcGISDomainValueEntity);
        }

        const ArcGISDomainEntity: ArcGISSDEDomainEntity = {
          apiVersion: 'geoportia.se/v1alpha1',
          kind: 'Table',
          metadata: {
            name: domain.name,
            title: domain.name,
            description: undefined,
            annotations: {
              [ANNOTATION_LOCATION]: `url:${this.uri}`,
              [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
            },
          },
          spec: {
            dialect: 'arcgis',
            dependencyOf: domainValues.map(domainValue => {
              return this.domainValueToDependency(domainValue, domain.name);
            }),
          } as any,
        };
        entities.push(ArcGISDomainEntity);
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
