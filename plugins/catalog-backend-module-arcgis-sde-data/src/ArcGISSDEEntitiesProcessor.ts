import {
  CatalogProcessor,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import {
  Entity,
  getCompoundEntityRef,
  RELATION_DEPENDENCY_OF,
  RELATION_DEPENDS_ON,
} from '@backstage/catalog-model';
import { LocationSpec } from '@backstage/plugin-catalog-common';

interface Field {
  aliasName: string;
  domain: string;
  fieldPrecision: number;
  fieldScale: number;
  isNullable: boolean;
  length: number;
  name: string;
  type: string;
}

export class ArcGISSDEEntitiesProcessor implements CatalogProcessor {
  getProcessorName(): string {
    return 'ArcGISSDEEntitiesProcessor';
  }

  async validateEntityKind(entity: Entity) {
    if (entity.apiVersion !== 'geoportia.se/v1alpha1') {
      return false;
    }
    if (entity.kind === 'ArcGISFeatureClassField') {
      return true;
    } else if (entity.kind === 'ArcGISFeatureClass') {
      return true;
    }
    return false;
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ) {
    if (entity.kind === 'ArcGISFeatureClass') {
      if (!entity.spec || !entity.spec.fields) {
        throw new Error(
          "ArcGISFeatureClass entity must have 'spec.fields' defined",
        );
      }

      // @ts-ignore
      const fields: Field[] = entity.spec.fields;

      for (const field of fields) {
        emit({
          type: 'relation',
          relation: {
            type: RELATION_DEPENDENCY_OF,
            source: getCompoundEntityRef(entity),
            target: {
              kind: 'ArcGISFeatureClassField',
              namespace: field.domain !== '' ? field.domain : 'default',
              name: field.name,
            },
          },
        });
        emit({
          type: 'relation',
          relation: {
            type: RELATION_DEPENDS_ON,
            target: getCompoundEntityRef(entity),
            source: {
              kind: 'ArcGISFeatureClassField',
              namespace: field.domain !== '' ? field.domain : 'default',
              name: field.name,
            },
          },
        });
      }
    }

    return entity;
  }
}
