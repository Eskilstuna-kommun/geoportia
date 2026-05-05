import {
  coreServices,
  createBackendModule,
} from '@backstage/backend-plugin-api';
import {
  PolicyDecision,
  AuthorizeResult,
} from '@backstage/plugin-permission-common';
import {
  PermissionPolicy,
  PolicyQuery,
} from '@backstage/plugin-permission-node';
import { policyExtensionPoint } from '@backstage/plugin-permission-node/alpha';
import { BackstageIdentityResponse } from '@backstage/plugin-auth-node';
import {
  GEOPORTIA_ROLES,
  metadataEntryCreatePermission,
  metadataEntryUpdatePermission,
  metadataEntryDeletePermission,
  metadataSensitiveReadPermission,
  metadataDelegateRolePermission,
} from '@internal/backstage-plugin-geoportia-metadata-common';

/**
 * Check if user belongs to a specific group
 */
function hasGroup(user: BackstageIdentityResponse | undefined, groupName: string): boolean {
  if (!user?.identity?.ownershipEntityRefs) {
    return false;
  }
  const groupNameLower = groupName.toLowerCase();
  // Check both with and without namespace prefix, case-insensitive
  return user.identity.ownershipEntityRefs.some(
    ref => ref.toLowerCase() === `group:default/${groupNameLower}` || 
           ref.toLowerCase() === `group:${groupNameLower}`
  );
}

/**
 * Check if user is a Super Admin
 */
function isSuperAdmin(user: BackstageIdentityResponse | undefined): boolean {
  return hasGroup(user, GEOPORTIA_ROLES.SUPER_ADMIN);
}

/**
 * Check if user is an Admin
 */
function isAdmin(user: BackstageIdentityResponse | undefined): boolean {
  return hasGroup(user, GEOPORTIA_ROLES.ADMIN);
}

/**
 * Check if user is a Moderator
 */
function isModerator(user: BackstageIdentityResponse | undefined): boolean {
  return hasGroup(user, GEOPORTIA_ROLES.MODERATOR);
}

class GeoportiaPermissionPolicy implements PermissionPolicy {
  async handle(
    request: PolicyQuery,
    user?: BackstageIdentityResponse,
  ): Promise<PolicyDecision> {
    const { permission } = request;

    // SuperAdmin has full access to everything
    if (isSuperAdmin(user)) {
      return { result: AuthorizeResult.ALLOW };
    }

    // Admin has full access except sensitive data
    if (isAdmin(user)) {
      // Deny access to sensitive data (like passwords)
      if (permission.name === metadataSensitiveReadPermission.name) {
        return { result: AuthorizeResult.DENY };
      }
      return { result: AuthorizeResult.ALLOW };
    }

    // Moderator can view all but only edit main geodata
    if (isModerator(user)) {
      if (permission.attributes.action === 'read') {
        if (permission.name === metadataSensitiveReadPermission.name) {
          return { result: AuthorizeResult.DENY };
        }
        return { result: AuthorizeResult.ALLOW };
      }

      // Allow create and update for metadata entries
      if (
        permission.name === metadataEntryCreatePermission.name ||
        permission.name === metadataEntryUpdatePermission.name
      ) {
        return { result: AuthorizeResult.ALLOW };
      }

      // Deny delete and delegation
      if (
        permission.name === metadataEntryDeletePermission.name ||
        permission.name === metadataDelegateRolePermission.name
      ) {
        return { result: AuthorizeResult.DENY };
      }
    }

    if (permission.attributes.action === 'read') {
      if (permission.name === metadataSensitiveReadPermission.name) {
        return { result: AuthorizeResult.DENY };
      }
      return { result: AuthorizeResult.ALLOW };
    }

    if (permission.name.startsWith('scaffolder.')) {
      return { result: AuthorizeResult.ALLOW };
    }

    return { result: AuthorizeResult.DENY };
  }
}


export const geoportiaPermissionPolicyModule = createBackendModule({
  pluginId: 'permission',
  moduleId: 'geoportia-policy',
  register(reg) {
    reg.registerInit({
      deps: {
        policy: policyExtensionPoint,
        logger: coreServices.logger,
      },
      async init({ policy, logger }) {
        logger.info('Registering GeoPortia permission policy');
        policy.setPolicy(new GeoportiaPermissionPolicy());
      },
    });
  },
});
