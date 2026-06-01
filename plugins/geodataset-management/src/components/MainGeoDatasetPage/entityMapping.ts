import { Entity } from '@backstage/catalog-model';
import { DatasetEntry } from '../../data';

export const mapSecurityClass = (
  securityClass?: string,
): DatasetEntry['skyddsklass'] => {
  switch (securityClass) {
    case 'Öppen data':
      return 'green';
    case 'Begränsad åtkomst':
      return 'yellow';
    case 'Skyddad':
      return 'red';
    default:
      return 'green';
  }
};

export const mapStatus = (
  status?: string,
): DatasetEntry['signaturstatus'] => {
  switch (status) {
    case 'Godkänd':
      return 'success';
    case 'Utkast':
      return 'warning';
    case 'Under granskning':
      return 'error';
    default:
      return 'warning';
  }
};

/**
 * Convert a Backstage `MetadataEntry` catalog entity into a row consumed by
 * the dataset table. All UI-facing derivations happen here so the page
 * component stays focused on state + rendering.
 */
export const entityToDatasetEntry = (
  entity: Entity,
  fallbackId: string,
): DatasetEntry => {
  const metadata = (entity.spec?.metadata as Record<string, unknown>) ?? {};
  const layerInfo =
    (metadata.layerInfo as Record<string, unknown>) ?? metadata;

  const securityClass = layerInfo.securityClass as string | undefined;
  const status = layerInfo.status as string | undefined;

  const titel =
    (layerInfo.title as string) ??
    (layerInfo.layerName as string) ??
    entity.metadata.title ??
    entity.metadata.name ??
    'Untitled';

  const sammanfattning =
    (layerInfo.summary as string) ??
    (layerInfo.description as string) ??
    '';

  const oppenData =
    typeof layerInfo.openData === 'boolean'
      ? (layerInfo.openData as boolean)
      : securityClass === 'Öppen data';

  const describedEntityRef =
    (entity.metadata.annotations?.['geoportia.se/described-entity-ref'] as
      | string
      | undefined) ??
    (entity.spec?.describedEntityRef as string | undefined);

  const entityRef =
    describedEntityRef ??
    `metadataentry:${entity.metadata.namespace ?? 'default'}/${
      entity.metadata.name
    }`;

  const isDeleted =
    entity.metadata.annotations?.['geoportia.se/deleted'] === 'true' ||
    (entity.spec as { deleted?: boolean } | undefined)?.deleted === true;

  return {
    id: entity.metadata.name ?? fallbackId,
    entityRef,
    isDeleted,
    titel,
    sammanfattning,
    signaturstatus: mapStatus(status),
    skyddsklass: mapSecurityClass(securityClass),
    oppenData,
  };
};
