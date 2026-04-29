export type MetadataEntryResource = {
  entityRef: string;
  contactPersons?: string[];
  dataOwners?: string[];
};

export const metadataPermissionRules = {};

export function checkIsContactPerson(
  resource: MetadataEntryResource,
  userEntityRef: string,
): boolean {
  if (!resource.contactPersons || resource.contactPersons.length === 0) {
    return false;
  }
  return resource.contactPersons.includes(userEntityRef);
}

export function checkIsDataOwner(
  resource: MetadataEntryResource,
  userEntityRef: string,
): boolean {
  if (!resource.dataOwners || resource.dataOwners.length === 0) {
    return false;
  }
  return resource.dataOwners.includes(userEntityRef);
}

export const createMetadataConditions = {
  isContactPerson: checkIsContactPerson,
  isDataOwner: checkIsDataOwner,
};
