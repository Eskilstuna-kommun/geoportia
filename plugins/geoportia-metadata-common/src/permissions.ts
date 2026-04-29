import { createPermission } from '@backstage/plugin-permission-common';

export const RESOURCE_TYPE_METADATA_ENTRY = 'geoportia-metadata-entry';

export const metadataEntryReadPermission = createPermission({
  name: 'geoportia.metadata.read',
  attributes: { action: 'read' },
  resourceType: RESOURCE_TYPE_METADATA_ENTRY,
});

export const metadataEntryCreatePermission = createPermission({
  name: 'geoportia.metadata.create',
  attributes: { action: 'create' },
});

export const metadataEntryUpdatePermission = createPermission({
  name: 'geoportia.metadata.update',
  attributes: { action: 'update' },
  resourceType: RESOURCE_TYPE_METADATA_ENTRY,
});

export const metadataEntryDeletePermission = createPermission({
  name: 'geoportia.metadata.delete',
  attributes: { action: 'delete' },
  resourceType: RESOURCE_TYPE_METADATA_ENTRY,
});

export const metadataEntrySuggestPermission = createPermission({
  name: 'geoportia.metadata.suggest',
  attributes: { action: 'update' },
  resourceType: RESOURCE_TYPE_METADATA_ENTRY,
});

export const metadataSensitiveReadPermission = createPermission({
  name: 'geoportia.metadata.sensitive.read',
  attributes: { action: 'read' },
});

export const metadataDelegateRolePermission = createPermission({
  name: 'geoportia.metadata.delegate',
  attributes: { action: 'update' },
});

export const geoportiaMetadataPermissions = [
  metadataEntryReadPermission,
  metadataEntryCreatePermission,
  metadataEntryUpdatePermission,
  metadataEntryDeletePermission,
  metadataEntrySuggestPermission,
  metadataSensitiveReadPermission,
  metadataDelegateRolePermission,
];

export const GEOPORTIA_ROLES = {
  SUPER_ADMIN: 'GG-U-Roll-GeoPortia-SuperAdmin',
  ADMIN: 'GG-U-Roll-GeoPortia-Admin',
  MODERATOR: 'GG-U-Roll-GeoPortia-Moderator',
} as const;

export type GeoportiaRole = (typeof GEOPORTIA_ROLES)[keyof typeof GEOPORTIA_ROLES];
