import {
  CatalogProcessor,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  Entity,
  getCompoundEntityRef,
  parseEntityRef,
} from '@backstage/catalog-model';
import { LoggerService } from '@backstage/backend-plugin-api';

export class GeoserverEntitiesProcessor implements CatalogProcessor {
  constructor(private logger: LoggerService) {}

  getProcessorName() {
    return 'GeoserverEntitiesProcessor';
  }

  async validateEntityKind(entity: any): Promise<boolean> {
    if (entity.apiVersion !== 'geoportia.se/v1alpha1') {
      return false;
    }
    if (entity.kind === 'GeoserverLayer') {
      return true;
    } else if (entity.kind === 'GeoserverStore') {
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
            type: 'partOf',
            source: getCompoundEntityRef(entity),
            target: parseEntityRef(relation.targetRef as string),
          },
        });
        emit({
          type: 'relation',
          relation: {
            type: 'hasPart',
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
