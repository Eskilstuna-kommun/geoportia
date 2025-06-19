import {
  CatalogProcessor,
  CatalogProcessorEmit,
  processingResult,
} from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  Entity,
  getCompoundEntityRef,
  parseEntityRef,
  RELATION_OWNED_BY,
  RELATION_OWNER_OF,
} from '@backstage/catalog-model';
import { isFMEWorkspaceEntity } from '@internal/fmeflow-common';

export class FMEFlowEntitiesProcessor implements CatalogProcessor {
  getProcessorName(): string {
    return 'FMEFlowEntitiesProcessor';
  }

  async validateEntityKind(entity: Entity): Promise<boolean> {
    return isFMEWorkspaceEntity(entity);
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<Entity> {
    if (!isFMEWorkspaceEntity(entity)) {
      return entity;
    }

    const selfRef = getCompoundEntityRef(entity);

    function doEmit(
      targets: string | string[] | undefined,
      context: { defaultKind?: string; defaultNamespace: string },
      outgoingRelation: string,
      incomingRelation: string,
    ): void {
      if (!targets) return;

      for (const target of [targets].flat()) {
        const targetRef = parseEntityRef(target, context);
        emit(
          processingResult.relation({
            source: selfRef,
            type: outgoingRelation,
            target: {
              kind: targetRef.kind,
              namespace: targetRef.namespace,
              name: targetRef.name,
            },
          }),
        );

        emit(
          processingResult.relation({
            source: {
              kind: targetRef.kind,
              namespace: targetRef.namespace,
              name: targetRef.name,
            },
            type: incomingRelation,
            target: selfRef,
          }),
        );
      }
    }

    // Apply ownership relations
    doEmit(
      entity.spec.owner,
      {
        defaultKind: 'FMEWorkspace',
        defaultNamespace: selfRef.namespace,
      },
      RELATION_OWNED_BY,
      RELATION_OWNER_OF,
    );

    return entity;
  }
}
