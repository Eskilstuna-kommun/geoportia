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
import CryptoJS from 'crypto-js';

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

  /**
  * Breaks out a full name into name and namespace parts.
  * Namespace is everything before the last dot, name is everything after.
  * If there is no dot, namespace is empty and name is the full name.
  * 
  * @param fullName The full name to break apart.
  * @returns A structure containing the name and namespace.
  */
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

  /**
   * Converts the name of a feature class, field, domain or domain value to a Backstage-compliant entity name.
   * 
   * @param name The name to convert.
   * @returns A Backstage-compliant version of the name.
   */
  convertNameToBackstageCompliant(name: string): string {
    return (
      `${name}`.substring(0, 58).replace(/[^a-zA-Z0-9._-]/g, '_') +
      '-' +
      CryptoJS.MD5(`${name}`).toString().substring(0, 4)
    );
  }

  /**
   * Creates a Backstage-compliant name for a feature class field.
   * 
   * @param field The feature class field.
   * @returns A Backstage-compliant name for the field.
   */
  createBackstageCompliantFeatureClassFieldName(
    field: ArcGISFeatureClassField,
  ): string {
    return this.convertNameToBackstageCompliant(
      field.domain !== '' ? `${field.domain}.${field.name}` : field.name,
    );
  }

  /**
   * Creates a compound entity reference for a feature class field. Used to generate dependencies for feature classes.
   * 
   * @param field The feature class field.
   * @returns A compound entity reference for the field.
   */
  featureClassFieldToDependency(
    field: ArcGISFeatureClassField,
  ): CompoundEntityRef {
    return {
      kind: 'Field',
      namespace: field.domain !== '' ? field.domain : 'default',
      name: this.createBackstageCompliantFeatureClassFieldName(field),
    };
  }

  /**
   * Creates a Backstage-compliant name for a domain value.
   * 
   * @param value The domain value.
   * @param domain The domain name.
   * @returns A Backstage-compliant name for the domain value.
   */
  createBackstageCompliantDomainValueName(
    value: ArcGISDomainValue,
    domain: string,
  ): string {
    return this.convertNameToBackstageCompliant(
      `${domain}.${value.code.toString()}`,
    );
  }

  /**
   * Creates a Backstage-compliant name for a feature class.
   * 
   * @param name The feature class name.
   * @param namespace The feature class namespace. Leave blank if the feature class does not belong to any namespace.
   * @returns A Backstage-compliant name for the feature class.
   */
  createBackstageCompliantFeatureClassName(
    name: string,
    namespace: string,
  ): string {
    return namespace !== ''
      ? this.convertNameToBackstageCompliant(`${namespace}.${name}`)
      : this.convertNameToBackstageCompliant(name);
  }

  /**
   * Creates a compound entity reference for a feature class. Used to generate dependencies for data sets.
   * 
   * @param name The feature class name.
   * @param namespace The feature class namespace. Leave blank for default namespace.
   * @returns A compound entity reference for the feature class.
   */
  featureClassToDependency(name: string, namespace: string): CompoundEntityRef {
    return {
      kind: 'Table',
      namespace: namespace !== '' ? namespace : 'default',
      name: this.createBackstageCompliantFeatureClassName(name, namespace),
    };
  }

  /**
   * Creates a compound entity reference for a domain value. Used to generate dependencies for domains.
   * 
   * @param value The domain value.
   * @param domain The domain name.
   * @returns A compound entity reference for the domain value.
   */
  domainValueToDependency(
    value: ArcGISDomainValue,
    domain: string,
  ): CompoundEntityRef {
    return {
      kind: 'Value',
      namespace: 'default',
      name: this.createBackstageCompliantDomainValueName(value, domain),
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
      // Create data sets, feature classes for each data sets, and fields for each feature class

      const dataSets = (await this.arcGISSDEClient.fetchDataSets()) ?? [];

      for (const dataSet of dataSets ?? []) {
        const { name: dataSetName, namespace: datasetNamespace } =
          this.breakOutName(dataSet.name);

        // Create feature classes for the data set

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

          // Create fields for the feature class

          for (const field of fields ?? []) {
            const ArcGISField: ArcGISSDEFeatureClassFieldEntity = {
              apiVersion: 'geoportia.se/v1alpha1',
              kind: 'Field',
              metadata: {
                name: this.createBackstageCompliantFeatureClassFieldName(field),
                title: `${field.name}`,
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

          // Create the feature class itself

          const ArcGISFeatureClassEntity: ArcGISSDEFeatureClassEntity = {
            apiVersion: 'geoportia.se/v1alpha1',
            kind: 'Table',
            metadata: {
              name: this.createBackstageCompliantFeatureClassName(
                featureClassName,
                featureClassNamespace,
              ),
              title: `${featureClassName}`,
              description: undefined,
              annotations: {
                [ANNOTATION_LOCATION]: `url:${this.uri}`,
                [ANNOTATION_ORIGIN_LOCATION]: `url:${this.uri}`,
              },
            },
            spec: {
              dialect: 'arcgis',
              dependencyOf: fields.map(field => {
                return this.featureClassFieldToDependency(field);
              }),
            } as any,
          };

          entities.push(ArcGISFeatureClassEntity);
        }

        // Create data set entity (skip root data set)

        if (dataSet.name !== 'root') {
          const ArcGISDataSetEntity: ArcGISSDEDataSetEntity = {
            apiVersion: 'geoportia.se/v1alpha1',
            kind: 'DataSet',
            metadata: {
              name:
                datasetNamespace !== ''
                  ? `${this.convertNameToBackstageCompliant(
                      datasetNamespace,
                    )}.${this.convertNameToBackstageCompliant(dataSet.name)}`
                  : this.convertNameToBackstageCompliant(dataSet.name),
              title: `${dataSet.name}`,
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

      // Create domains and domain values

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
              name: this.createBackstageCompliantDomainValueName(
                domainValue,
                domain.name,
              ),
              title: `${domainValue.code}`,
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
            name: this.convertNameToBackstageCompliant(domain.name),
            title: `${domain.name}`,
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
