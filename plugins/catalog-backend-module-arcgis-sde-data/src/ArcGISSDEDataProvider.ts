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
  ArcGISSDEDataSetEntity,
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

  // Breaks out a full name into name and namespace parts.
  // Namespace is everything before the last dot, name is everything after.
  // If there is no dot, namespace is empty and name is the full name.
  breakOutName(fullName: string): { name: string; namespace: string } {
    const lastDotInNameIndex = fullName.lastIndexOf('.');
    const name =
      lastDotInNameIndex === -1
        ? fullName
        : fullName.substring(lastDotInNameIndex + 1);
    const namespace =
      lastDotInNameIndex === -1
        ? ''
        : fullName.substring(0, lastDotInNameIndex);
    return { name, namespace };
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

  featureClassToDependency(name: string, namespace: string): CompoundEntityRef {
    return {
      kind: 'Table',
      namespace: namespace !== '' ? name : 'default',
      name,
    };
  }

  domainValueToDependency(
    value: ArcGISDomainValue,
    domain: string,
  ): CompoundEntityRef {
    return {
      kind: 'Value',
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
      const dataSets = (await this.arcGISSDEClient.fetchDataSets()) ?? [];

      for (const dataSet of dataSets ?? []) {
        const { name: dataSetName, namespace: datasetNamespace } =
          this.breakOutName(dataSet.name);

        for (const dataSetFeatureClass of dataSet.featureClasses ?? []) {
          const { name: featureClassName, namespace: featureClassNamespace } =
            this.breakOutName(dataSetFeatureClass);

          this.loggerService.debug(
            'Processing feature class: ' +
              featureClassName +
              ' in namespace: ' +
              featureClassNamespace,
          );

          let fields;
          try {
            fields = await this.arcGISSDEClient.fetchFields(
              dataSetName,
              featureClassName,
            );
          } catch (error) {
            this.loggerService.warn(
              `Failed to fetch fields for feature class ${featureClassName}: ${error}. Skipping.`,
            );
            continue;
          }

          for (const field of fields ?? []) {
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
                featureClassNamespace !== ''
                  ? `${featureClassNamespace}.${featureClassName}`
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

        if (dataSet.name !== 'root') {
          const ArcGISDataSetEntity: ArcGISSDEDataSetEntity = {
            apiVersion: 'geoportia.se/v1alpha1',
            kind: 'DataSet',
            metadata: {
              name:
                datasetNamespace !== ''
                  ? `${datasetNamespace}.${dataSet.name}`
                  : dataSet.name,
              title: dataSet.name,
              description: undefined,
              annotations: {
                [ANNOTATION_LOCATION]: `url:${this.uri}`,
                [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
              },
            },
            spec: {
              dialect: 'arcgis',
              dependencyOf: dataSet.featureClasses.map(featureClass => {
                const {
                  name: featureClassName,
                  namespace: featureClassNamespace,
                } = this.breakOutName(featureClass);
                return this.featureClassToDependency(
                  featureClassName,
                  featureClassNamespace,
                );
              }),
            } as any,
          };
          entities.push(ArcGISDataSetEntity);
        }
      }

      const domains = (await this.arcGISSDEClient.fetchDomains()) ?? [];

      for (const domain of domains) {
        const { name: domainName } = this.breakOutName(domain.name);
        const domainValues =
          (await this.arcGISSDEClient.fetchDomainValues(domainName)) ?? [];

        for (const domainValue of domainValues) {
          const ArcGISDomainValueEntity: ArcGISSDEDomainValueEntity = {
            apiVersion: 'geoportia.se/v1alpha1',
            kind: 'Value',
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
          kind: 'GPDomain',
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
