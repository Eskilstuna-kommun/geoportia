import { Entity } from '@backstage/catalog-model/index';
import { LocationSpec } from '@backstage/plugin-catalog-common/index';
import {
  CatalogProcessor,
  CatalogProcessorCache,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import { MetadataService } from './services/MetadataService/types';
import {
  ANNOTATION_LOCATION,
  getCompoundEntityRef,
} from '@backstage/catalog-model';

export class MetadataEntitiesProcessor implements CatalogProcessor {
  constructor(private readonly service: MetadataService) {}

  getProcessorName(): string {
    return 'MetadataEntitiesProcessor';
  }
  async postProcessEntity?(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
    _cache: CatalogProcessorCache,
  ): Promise<Entity> {
    if (
      entity.apiVersion !== 'geoportia.se/v1alpha1' ||
      entity.kind !== 'Table'
    ) {
      return entity;
    }
    try {
      const metadata = await this.service.getTable({
        name: entity.metadata.name,
        database: entity.metadata.annotations![ANNOTATION_LOCATION],
      });
      emit({
        type: 'relation',
        relation: {
          type: 'ownedBy',
          source: getCompoundEntityRef(entity),
          target: {
            kind: 'User',
            namespace: 'default',
            name: metadata.owner,
          },
        },
      });
      emit({
        type: 'relation',
        relation: {
          type: 'ownerOf',
          target: getCompoundEntityRef(entity),
          source: {
            kind: 'User',
            namespace: 'default',
            name: metadata.owner,
          },
        },
      });
    } catch (e) {
      console.error(e);
    }

    return entity;
  }
}
