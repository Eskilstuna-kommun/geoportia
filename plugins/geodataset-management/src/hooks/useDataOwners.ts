import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';

export type DataOwnerEntity = Entity & {
  spec: NonNullable<Entity['spec']> & {
    type: 'data-owner';
    profile?: { displayName?: string; email?: string };
    internalOrganisation?: boolean;
    organisationName?: string;
    administration?: string;
    department?: string;
    unit?: string;
    databaseUsers?: Array<{
      platform: string;
      name: string;
      description?: string;
    }>;
    responsible?: string;
    status?: string;
    receiveReminders?: boolean;
    managementAgreementHistory?: unknown[];
  };
};

export interface DataOwnerCatalogData {
  owners: DataOwnerEntity[];
  groupsByRef: Map<string, Entity>;
  usersByRef: Map<string, Entity>;
}

/** Loads Data Owners and their referenced catalog Groups and Users. */
export const useDataOwners = () => {
  const catalogApi = useApi(catalogApiRef);

  return useAsyncRetry(async (): Promise<DataOwnerCatalogData> => {
    const [groupsResponse, usersResponse] = await Promise.all([
      catalogApi.getEntities({ filter: { kind: 'Group' } }),
      catalogApi.getEntities({ filter: { kind: 'User' } }),
    ]);

    const groups = groupsResponse.items;
    const users = usersResponse.items;

    return {
      owners: groups.filter(
        (entity): entity is DataOwnerEntity =>
          entity.kind.toLowerCase() === 'group' &&
          entity.spec?.type === 'data-owner',
      ),
      groupsByRef: new Map(groups.map(entity => [stringifyEntityRef(entity), entity])),
      usersByRef: new Map(users.map(entity => [stringifyEntityRef(entity), entity])),
    };
  }, [catalogApi]);
};
