import { useApi, identityApiRef } from '@backstage/core-plugin-api';
import { GEOPORTIA_ROLES } from '@internal/backstage-plugin-geoportia-metadata-common';
import useAsync from 'react-use/lib/useAsync';

export function useIsGeoportiaAdmin(): { loading: boolean; isAdmin: boolean } {
  const identityApi = useApi(identityApiRef);

  const { value, loading } = useAsync(async () => {
    const identity = await identityApi.getBackstageIdentity();
    const refs = identity.ownershipEntityRefs.map(r => r.toLowerCase());
    const matches = (groupName: string) => {
      const lower = groupName.toLowerCase();
      return refs.some(
        r => r === `group:default/${lower}` || r === `group:${lower}`,
      );
    };
    return matches(GEOPORTIA_ROLES.SUPER_ADMIN) || matches(GEOPORTIA_ROLES.ADMIN);
  }, [identityApi]);

  return { loading, isAdmin: !!value };
}
