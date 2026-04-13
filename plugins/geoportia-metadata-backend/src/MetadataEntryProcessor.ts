import {
  CatalogProcessor,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import { Entity, getCompoundEntityRef, parseEntityRef } from '@backstage/catalog-model';
import {
  RELATION_DESCRIBES,
  RELATION_DESCRIBED_BY,
} from '@internal/geoportia-metadata-common';

export class MetadataEntryProcessor implements CatalogProcessor {
  getProcessorName() {
    return 'MetadataEntryProcessor';
  }

  async validateEntityKind(entity: Entity) {
    return (
      entity.apiVersion === 'geoportia.se/v1alpha1' &&
      entity.kind === 'MetadataEntry'
    );
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ) {
    if (
      entity.apiVersion !== 'geoportia.se/v1alpha1' ||
      entity.kind !== 'MetadataEntry'
    ) {
      return entity;
    }

    const describedEntityRef = entity.spec?.describedEntityRef as
      | string
      | undefined;
    if (!describedEntityRef) {
      return entity;
    }

    const targetRef = parseEntityRef(describedEntityRef);
    const sourceRef = getCompoundEntityRef(entity);

    // Emit bidirectional relations
    // MetadataEntry describes the target entity
    emit({
      type: 'relation',
      relation: {
        type: RELATION_DESCRIBES,
        source: sourceRef,
        target: {
          kind: targetRef.kind,
          namespace: targetRef.namespace,
          name: targetRef.name,
        },
      },
    });

    // Target entity is described by the MetadataEntry
    emit({
      type: 'relation',
      relation: {
        type: RELATION_DESCRIBED_BY,
        source: {
          kind: targetRef.kind,
          namespace: targetRef.namespace,
          name: targetRef.name,
        },
        target: sourceRef,
      },
    });

    return entity;
  }
}
