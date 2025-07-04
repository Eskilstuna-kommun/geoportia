import {
  CatalogProcessor,
  CatalogProcessorEmit,
  processingResult,
} from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  Entity,
  getCompoundEntityRef,
  isResourceEntity,
  parseEntityRef,
} from '@backstage/catalog-model';
import { isFMEWorkspaceEntity, isTableEntity } from '@internal/fmeflow-common';

export class FMEFlowEntitiesProcessor implements CatalogProcessor {
  getProcessorName(): string {
    return 'FMEFlowEntitiesProcessor';
  }

  async validateEntityKind(entity: Entity): Promise<boolean> {
    return (
      isFMEWorkspaceEntity(entity) ||
      isResourceEntity(entity) ||
      isTableEntity(entity)
    );
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

    // 1. Table dependency relations
    const seenTables = new Set<string>();
    if (Array.isArray(entity.spec.tables)) {
      for (const { schema, table } of entity.spec.tables as Array<{ schema: string; table: string }>) {
        if (!schema || !table) continue;
        const raw = `${schema}.${table}`.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
        if (seenTables.has(raw)) continue;
        seenTables.add(raw);

        doEmit(
          `Table:${raw}`,
          { defaultNamespace: selfRef.namespace },
          'dependsOn',
          'dependencyOf',
        );
      }
    }

    // 2. Database relation (Resource)
    const rawDbName = entity.metadata.annotations?.['fmeflow/database'];
    if (rawDbName) {
      const clean = rawDbName
        .toLowerCase()
        .replace(/`/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '');

      doEmit(
        `Resource:${clean}`,
        { defaultNamespace: selfRef.namespace },
        'dependsOn',
        'dependencyOf',
      );
    }

    return entity;
  }
}
