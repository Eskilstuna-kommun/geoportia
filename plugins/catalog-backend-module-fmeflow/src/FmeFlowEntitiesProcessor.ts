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
import { isFmeWorkspaceEntity  } from '@internal/fmeflow-common';

export class FmeFlowEntitiesProcessor implements CatalogProcessor {
  getProcessorName(): string {
    return 'FmeFlowEntitiesProcessor';
  }

  async validateEntityKind(entity: Entity): Promise<boolean> {
    return (isFmeWorkspaceEntity(entity)
    );
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<Entity> {
    if (!isFmeWorkspaceEntity(entity)) {
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
