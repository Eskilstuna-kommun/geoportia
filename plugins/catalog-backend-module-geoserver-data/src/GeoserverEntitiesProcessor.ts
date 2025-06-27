import {
  CatalogProcessor,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  Entity,
  getCompoundEntityRef,
  parseEntityRef,
  RELATION_PART_OF,
  RELATION_HAS_PART,
} from '@backstage/catalog-model';
import { LoggerService } from '@backstage/backend-plugin-api';
import {
  isGeoserverStoreEntity,
  isGeoserverLayerEntity,
} from '@internal/geoserver-data-common';

export class GeoserverEntitiesProcessor implements CatalogProcessor {
  constructor(private logger: LoggerService) {}

  getProcessorName() {
    return 'GeoserverEntitiesProcessor';
  }

  async validateEntityKind(entity: any): Promise<boolean> {
    if (entity.apiVersion !== 'geoportia.se/v1alpha1') {
      return false;
    }
    if (isGeoserverStoreEntity(entity)) {
      return true;
    } else if (isGeoserverLayerEntity(entity)) {
      return true;
    }
    return false;
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ) {
    if (entity.kind === 'GeoserverLayer') {
      const relation = entity.spec?.store;
      if (
        relation !== null &&
        relation !== undefined &&
        typeof relation === 'object' &&
        'targetRef' in relation &&
        typeof (relation as { targetRef?: unknown }).targetRef === 'string'
      ) {
        emit({
          type: 'relation',
          relation: {
            type: RELATION_PART_OF,
            source: getCompoundEntityRef(entity),
            target: parseEntityRef(relation.targetRef as string),
          },
        });
        emit({
          type: 'relation',
          relation: {
            type: RELATION_HAS_PART,
            source: parseEntityRef(relation.targetRef as string),
            target: getCompoundEntityRef(entity),
          },
        });
        this.logger.debug(
          `Emitted relation between from ${entity.metadata.name} and ${relation.targetRef}.`,
        );
      }
    }

    return entity;
  }
}
