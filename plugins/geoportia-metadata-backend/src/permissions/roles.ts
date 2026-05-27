import { GEOPORTIA_ROLES } from '@internal/backstage-plugin-geoportia-metadata-common';

function hasGroup(ownershipEntityRefs: string[] | undefined, groupName: string): boolean {
  if (!ownershipEntityRefs) {
    return false;
  }
  const lower = groupName.toLowerCase();
  return ownershipEntityRefs.some(
    ref =>
      ref.toLowerCase() === `group:default/${lower}` ||
      ref.toLowerCase() === `group:${lower}`,
  );
}

export function isSuperAdminRef(ownershipEntityRefs: string[] | undefined): boolean {
  return hasGroup(ownershipEntityRefs, GEOPORTIA_ROLES.SUPER_ADMIN);
}

export function isAdminRef(ownershipEntityRefs: string[] | undefined): boolean {
  return hasGroup(ownershipEntityRefs, GEOPORTIA_ROLES.ADMIN);
}

export function isModeratorRef(ownershipEntityRefs: string[] | undefined): boolean {
  return hasGroup(ownershipEntityRefs, GEOPORTIA_ROLES.MODERATOR);
}

export function hasAdminLikeRole(ownershipEntityRefs: string[] | undefined): boolean {
  return (
    isSuperAdminRef(ownershipEntityRefs) ||
    isAdminRef(ownershipEntityRefs) ||
    isModeratorRef(ownershipEntityRefs)
  );
}
