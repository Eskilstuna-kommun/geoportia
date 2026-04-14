import React from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import {
  InfoCard,
  WarningPanel,
} from '@backstage/core-components';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { RELATION_DESCRIBED_BY } from '@internal/geoportia-metadata-common';
import { MetadataEntryViewer } from './MetadataEntryViewer';

export interface EntityMetadataEntryContentProps {
  /**
   * Optional title for the card. Defaults to "Metadata".
   */
  title?: string;

  /**
   * Whether the form is editable. Defaults to false (readonly).
   */
  editable?: boolean;
}

/**
 * A component that displays metadata for the current entity.
 * It finds the related MetadataEntry via the "describedBy" relation
 * and renders the metadata form.
 *
 * This component uses useEntity to get the current entity,
 * then looks up the MetadataEntry that describes it.
 */
export const EntityMetadataEntryContent: React.FC<
  EntityMetadataEntryContentProps
> = ({ title = 'Metadata', editable = false }) => {
  const { entity } = useEntity();

  // Find the MetadataEntry that describes this entity via relations
  const metadataRelation = entity.relations?.find(
    rel => rel.type === RELATION_DESCRIBED_BY,
  );

  if (!metadataRelation) {
    const entityRef = stringifyEntityRef(entity);
    return (
      <InfoCard title={title}>
        <WarningPanel title="No metadata available">
          No metadata has been defined for this entity ({entityRef}).
        </WarningPanel>
      </InfoCard>
    );
  }

  // The targetRef is the MetadataEntry entity reference
  const metadataEntityRef = metadataRelation.targetRef;

  return (
    <MetadataEntryViewer
      entityRef={metadataEntityRef}
      title={title}
      editable={editable}
    />
  );
};
