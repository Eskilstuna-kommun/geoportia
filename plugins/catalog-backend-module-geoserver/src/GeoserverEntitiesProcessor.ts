import {
  CatalogProcessor,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import { Entity, getCompoundEntityRef } from '@backstage/catalog-model';
import { LoggerService } from '@backstage/backend-plugin-api';

export class GeoserverEntitiesProcessor implements CatalogProcessor {
  constructor(private logger: LoggerService) {}

  getProcessorName() {
    return 'GeoserverEntitiesProcessor';
  }

  async validateEntityKind(entity: any): Promise<boolean> {
    return (
      entity.apiVersion === 'geoportia.se/v1alpha1' &&
      entity.kind === 'GeoserverLayer'
    );
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ) {
    return entity;
  }
}
