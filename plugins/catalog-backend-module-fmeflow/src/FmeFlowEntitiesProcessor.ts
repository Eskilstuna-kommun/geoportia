import {
  CatalogProcessor,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  Entity,
  getCompoundEntityRef,
  RELATION_OWNED_BY,
} from '@backstage/catalog-model';

export class FmeFlowEntitiesProcessor implements CatalogProcessor {
  getProcessorName(): string {
    return 'FmeFlowEntitiesProcessor';
  }

  async validateEntityKind(entity: Entity): Promise<boolean> {
    return (
      entity.apiVersion === 'geoportia.se/v1alpha1' &&
      entity.kind === 'FmeWorkspace' &&
      typeof entity.spec === 'object' &&
      typeof entity.spec.owner === 'string'
    );
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<Entity> {
    if (entity.kind !== 'FmeWorkspace') {
      return entity;
    }

    const sourceRef = getCompoundEntityRef(entity);

    if (entity.spec?.owner) {
      emit({
        type: 'relation',
        relation: {
          type: RELATION_OWNED_BY,
          source: sourceRef,
          target: {
            kind: 'Group',
            namespace: 'default',
            name: String(entity.spec.owner).split('/').pop() ?? 'data-team',
          },
        },
      });
    }

    return entity;
  }
}
