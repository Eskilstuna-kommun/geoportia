import {
  CatalogProcessor,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import { Entity, getCompoundEntityRef, parseEntityRef } from '@backstage/catalog-model';

// Relation types for Attribute <-> MetadataEntry
export const RELATION_ATTRIBUTE_OF = 'attributeOf';
export const RELATION_HAS_ATTRIBUTE = 'hasAttribute';

export class AttributeProcessor implements CatalogProcessor {
  getProcessorName() {
    return 'AttributeProcessor';
  }

  async validateEntityKind(entity: Entity) {
    return (
      entity.apiVersion === 'geoportia.se/v1alpha1' &&
      entity.kind === 'Attribute'
    );
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ) {
    if (
      entity.apiVersion !== 'geoportia.se/v1alpha1' ||
      entity.kind !== 'Attribute'
    ) {
      return entity;
    }

    const parentMetadataEntry = entity.spec?.parentMetadataEntry as
      | string
      | undefined;
    if (!parentMetadataEntry) {
      return entity;
    }

    const targetRef = parseEntityRef(parentMetadataEntry);
    const sourceRef = getCompoundEntityRef(entity);

    // Emit bidirectional relations
    // Attribute is attributeOf the MetadataEntry
    emit({
      type: 'relation',
      relation: {
        type: RELATION_ATTRIBUTE_OF,
        source: sourceRef,
        target: {
          kind: targetRef.kind,
          namespace: targetRef.namespace,
          name: targetRef.name,
        },
      },
    });

    // MetadataEntry hasAttribute the Attribute
    emit({
      type: 'relation',
      relation: {
        type: RELATION_HAS_ATTRIBUTE,
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
