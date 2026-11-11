import express, { Router } from 'express';
import {
  AuthService,
  HttpAuthService,
  RootConfigService,
  UserInfoService,
} from '@backstage/backend-plugin-api';
import { CatalogApi } from '@backstage/catalog-client';
import {
  DEFAULT_NAMESPACE,
  Entity,
  FieldFormatEntityPolicy,
  GroupEntity,
  parseEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import {
  ConflictError,
  InputError,
  NotAllowedError,
  NotFoundError,
} from '@backstage/errors';
import { Knex } from 'knex';
import { z } from 'zod';
import { inputSchema } from './actions/createDataOwner';
import {
  hasAdminLikeRole,
  isAdminRef,
  isSuperAdminRef,
} from './permissions/roles';

interface StoredEntityRow {
  entity_ref: string;
  entity: Entity | string;
  updated_at?: Date;
}

const hierarchyKind = z.enum(['administration', 'department', 'unit']);
const hierarchyInputSchema = z.object({
  name: z.string().trim().min(1),
  title: z.string().trim().min(1),
  kind: hierarchyKind,
  parent: z.string().optional(),
});

function rowEntity(row: StoredEntityRow): Entity {
  return typeof row.entity === 'string' ? JSON.parse(row.entity) as Entity : row.entity;
}

function normalizedRef(value: string, kind: string): string {
  try {
    const ref = parseEntityRef(value, {
      defaultKind: kind,
      defaultNamespace: DEFAULT_NAMESPACE,
    });
    if (ref.kind.toLowerCase() !== kind.toLowerCase()) {
      throw new Error(`Expected ${kind}`);
    }
    return stringifyEntityRef(ref);
  } catch (error) {
    throw new InputError(`Invalid ${kind} reference: ${value}`, error);
  }
}

function isChildOf(child: Entity, parent: Entity): boolean {
  const parentRef = stringifyEntityRef(parent);
  const childRef = stringifyEntityRef(child);
  if (typeof child.spec?.parent === 'string') {
    return normalizedRef(child.spec.parent, 'Group') === parentRef;
  }
  return Boolean(
    child.relations?.some(
      relation => relation.type === 'childOf' && relation.targetRef === parentRef,
    ) ||
      (Array.isArray(parent.spec?.children) &&
        parent.spec.children.some(
          ref => typeof ref === 'string' && normalizedRef(ref, 'Group') === childRef,
        )),
  );
}

function configuredOptions(rootConfig: RootConfigService) {
  const config = rootConfig.getOptionalConfig('geoportia.dataOwner');
  const statuses = config?.getOptionalStringArray('statuses') ?? [];
  const databaseUsers = config
    ?.getOptionalConfigArray('databaseUsers')
    ?.map(item => ({
      platform: item.getString('platform'),
      name: item.getString('name'),
      description: item.getOptionalString('description'),
    })) ?? [];
  return { statuses, databaseUsers };
}

async function getManagedEntities(database: Knex): Promise<Entity[]> {
  const rows = await database<StoredEntityRow>('geoportia_data_owner_entities').select(
    'entity_ref',
    'entity',
  );
  return rows.map(rowEntity);
}

async function getCatalogEntity(
  value: string,
  kind: string,
  credentials: Awaited<ReturnType<HttpAuthService['credentials']>>,
  auth: AuthService,
  catalogApi: CatalogApi,
  database: Knex,
): Promise<Entity> {
  const ref = normalizedRef(value, kind);
  const managed = (await getManagedEntities(database)).find(
    entity => stringifyEntityRef(entity) === ref,
  );
  if (managed && managed.kind.toLowerCase() === kind.toLowerCase()) {
    return managed;
  }

  const { token } = await auth.getPluginRequestToken({
    onBehalfOf: credentials,
    targetPluginId: 'catalog',
  });
  const entity = await catalogApi.getEntityByRef(ref, { token });
  if (!entity || entity.kind.toLowerCase() !== kind.toLowerCase()) {
    throw new InputError(`${kind} not found in catalog: ${ref}`);
  }
  return entity;
}

async function authorize(
  req: express.Request,
  httpAuth: HttpAuthService,
  userInfo: UserInfoService,
  requireAdmin: boolean,
) {
  const credentials = await httpAuth.credentials(req, { allow: ['user'] });
  const info = await userInfo.getUserInfo(credentials);
  const isOwnerManager = hasAdminLikeRole(info.ownershipEntityRefs);
  const isValueSetManager =
    isAdminRef(info.ownershipEntityRefs) || isSuperAdminRef(info.ownershipEntityRefs);
  if (requireAdmin && !isOwnerManager) {
    throw new NotAllowedError('You are not allowed to manage data owners');
  }
  return { credentials, isOwnerManager, isValueSetManager };
}

async function saveEntity(
  database: Knex,
  entity: GroupEntity,
  allowUpdate = false,
) {
  const entityRef = stringifyEntityRef(entity);
  const existing = await database<StoredEntityRow>('geoportia_data_owner_entities')
    .where({ entity_ref: entityRef })
    .first();
  if (existing && !allowUpdate) {
    throw new ConflictError(`Entity already exists: ${entityRef}`);
  }
  await database<StoredEntityRow>('geoportia_data_owner_entities')
    .insert({ entity_ref: entityRef, entity: JSON.stringify(entity) })
    .onConflict('entity_ref')
    .merge({ entity: JSON.stringify(entity), updated_at: new Date() });
  return entity;
}

export function createDataOwnerRouter(options: {
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  rootConfig: RootConfigService;
  database: Knex;
  catalogApi: CatalogApi;
  auth: AuthService;
}): Router {
  const { httpAuth, userInfo, rootConfig, database, catalogApi, auth } = options;
  const router = Router();
  router.use(express.json());

  router.get('/access', async (req, res, next) => {
    try {
      const access = await authorize(req, httpAuth, userInfo, false);
      res.json({
        canManage: access.isOwnerManager,
        canManageValues: access.isValueSetManager,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/options', async (req, res, next) => {
    try {
      await httpAuth.credentials(req, { allow: ['user'] });
      const entities = await getManagedEntities(database);
      const hierarchy = entities.filter(
        entity => typeof entity.spec?.hierarchyKind === 'string',
      );
      res.json({
        organizationName: rootConfig.getOptionalString('organization.name') ?? '',
        ...configuredOptions(rootConfig),
        hierarchy,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/', async (req, res, next) => {
    try {
      await httpAuth.credentials(req, { allow: ['user'] });
      const entities = (await getManagedEntities(database)).filter(
        entity => entity.kind === 'Group' && entity.spec?.type === 'data-owner',
      );
      res.json({ items: entities });
    } catch (error) {
      next(error);
    }
  });

  const saveDataOwner = async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
    existingName?: string,
  ) => {
    try {
      const { credentials } = await authorize(req, httpAuth, userInfo, true);
      const parsed = inputSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new InputError(`Invalid data-owner input: ${parsed.error.message}`);
      }
      const input = parsed.data;
      if (existingName && existingName !== input.name) {
        throw new InputError('The data-owner entity name cannot be changed');
      }
      const ownerRef = `group:${DEFAULT_NAMESPACE}/${input.name}`;
      const storedOwner = (await getManagedEntities(database)).find(
        entity => stringifyEntityRef(entity) === ownerRef && entity.spec?.type === 'data-owner',
      );
      if (existingName && !storedOwner) {
        throw new NotFoundError(`Data Owner not found: ${ownerRef}`);
      }
      if (!existingName) {
        const { token } = await auth.getPluginRequestToken({
          onBehalfOf: credentials,
          targetPluginId: 'catalog',
        });
        if (await catalogApi.getEntityByRef(ownerRef, { token })) {
          throw new ConflictError(`Entity already exists: ${ownerRef}`);
        }
      }

      let organizationName: string;
      if (input.internalOrganisation) {
        if (input.organisationName || input.organisationEmail) {
          throw new InputError('External organisation fields are not allowed for internal owners');
        }
        organizationName = rootConfig.getOptionalString('organization.name')?.trim() ?? '';
        if (!organizationName) {
          throw new InputError('organization.name must be configured for internal owners');
        }
      } else {
        if (!input.organisationName || !input.organisationEmail) {
          throw new InputError('External owners require organisationName and organisationEmail');
        }
        if (input.administration || input.department || input.unit) {
          throw new InputError('Organisation hierarchy is only allowed for internal owners');
        }
        organizationName = input.organisationName;
      }
      if (input.department && !input.administration) {
        throw new InputError('department requires administration');
      }
      if (input.unit && !input.department) {
        throw new InputError('unit requires department');
      }

      const configured = configuredOptions(rootConfig);
      if (!configured.statuses.includes(input.status)) {
        throw new InputError('Select a configured Data Owner status');
      }
      const allowedUsers = new Set(
        configured.databaseUsers.map(user => `${user.platform.toLowerCase()}\0${user.name}`),
      );
      if (input.databaseUsers.some(
        user => !allowedUsers.has(`${user.platform.toLowerCase()}\0${user.name}`),
      )) {
        throw new InputError('Select database users from the configured options');
      }

      const usedUsers = new Set<string>();
      for (const user of input.databaseUsers) {
        const key = `${user.platform.toLowerCase()}\0${user.name}`;
        if (usedUsers.has(key)) {
          throw new InputError(`Duplicate database user: ${user.platform}/${user.name}`);
        }
        usedUsers.add(key);
      }

      const hierarchy: Record<string, string> = {};
      let previous: Entity | undefined;
      for (const [field, expectedKind] of [
        ['administration', 'administration'],
        ['department', 'department'],
        ['unit', 'unit'],
      ] as const) {
        const value = input[field];
        if (!value) continue;
        const group = await getCatalogEntity(
          value,
          'Group',
          credentials,
          auth,
          catalogApi,
          database,
        );
        if (group.spec?.hierarchyKind !== expectedKind) {
          throw new InputError(`${field} must reference a configured ${expectedKind}`);
        }
        if (previous && !isChildOf(group, previous)) {
          throw new InputError(`${field} must belong to ${stringifyEntityRef(previous)}`);
        }
        hierarchy[field] = stringifyEntityRef(group);
        previous = group;
      }

      let responsible: string | undefined;
      if (input.responsible) {
        responsible = stringifyEntityRef(
          await getCatalogEntity(
            input.responsible,
            'User',
            credentials,
            auth,
            catalogApi,
            database,
          ),
        );
      }

      const spec = {
        type: 'data-owner',
        profile: {
          displayName: input.displayName ?? input.name,
          ...(!input.internalOrganisation && { email: input.organisationEmail }),
        },
        children: [],
        ...(previous && { parent: stringifyEntityRef(previous) }),
        internalOrganisation: input.internalOrganisation,
        organisationName: organizationName,
        ...hierarchy,
        databaseUsers: input.databaseUsers,
        ...(responsible && { responsible }),
        status: input.status,
        receiveReminders: input.receiveReminders,
        managementAgreementHistory: input.managementAgreementHistory,
      };
      const entity: GroupEntity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Group',
        metadata: {
          name: input.name,
          namespace: DEFAULT_NAMESPACE,
          title: input.displayName ?? input.name,
          ...(input.description !== undefined && { description: input.description }),
        },
        spec,
      };
      await new FieldFormatEntityPolicy().enforce(entity);
      await saveEntity(database, entity, Boolean(existingName));
      res.status(existingName ? 200 : 201).json(entity);
    } catch (error) {
      next(error);
    }
  };

  router.post('/', (req, res, next) => saveDataOwner(req, res, next));
  router.put('/:name', (req, res, next) =>
    saveDataOwner(req, res, next, decodeURIComponent(req.params.name)),
  );

  router.delete('/:name', async (req, res, next) => {
    try {
      await authorize(req, httpAuth, userInfo, true);
      const name = decodeURIComponent(req.params.name);
      const ref = `group:${DEFAULT_NAMESPACE}/${name}`;
      const owner = (await getManagedEntities(database)).find(
        entity =>
          stringifyEntityRef(entity) === ref && entity.spec?.type === 'data-owner',
      );
      if (!owner) throw new NotFoundError(`Data Owner not found: ${ref}`);
      const deleted = await database<StoredEntityRow>('geoportia_data_owner_entities')
        .where({ entity_ref: ref })
        .del();
      if (deleted === 0) throw new NotFoundError(`Data Owner not found: ${ref}`);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post('/hierarchy', async (req, res, next) => {
    try {
      const access = await authorize(req, httpAuth, userInfo, true);
      if (!access.isValueSetManager) throw new NotAllowedError('Only administrators can manage value lists');
      const input = hierarchyInputSchema.parse(req.body);
      const configName = input.name.toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
      if (!configName) throw new InputError('A valid Backstage entity name is required');
      let expectedParentKind: 'administration' | 'department' | undefined;
      if (input.kind === 'department') expectedParentKind = 'administration';
      if (input.kind === 'unit') expectedParentKind = 'department';
      if (expectedParentKind && !input.parent) {
        throw new InputError(`${input.kind} requires a parent ${expectedParentKind}`);
      }
      if (!expectedParentKind && input.parent) {
        throw new InputError('Administrations cannot have a parent');
      }
      let parent: Entity | undefined;
      if (input.parent) {
        parent = await getCatalogEntity(
          input.parent,
          'Group',
          access.credentials,
          auth,
          catalogApi,
          database,
        );
        if (parent.spec?.hierarchyKind !== expectedParentKind) {
          throw new InputError(`Parent must be a ${expectedParentKind}`);
        }
      }
      const spec = {
        type: 'data-owner-hierarchy',
        hierarchyKind: input.kind,
        children: [],
        ...(parent && { parent: stringifyEntityRef(parent) }),
      };
      const entity: GroupEntity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Group',
        metadata: {
          name: configName,
          namespace: DEFAULT_NAMESPACE,
          title: input.title,
        },
        spec,
      };
      const { token } = await auth.getPluginRequestToken({
        onBehalfOf: access.credentials,
        targetPluginId: 'catalog',
      });
      if (await catalogApi.getEntityByRef(stringifyEntityRef(entity), { token })) {
        throw new ConflictError(`Entity already exists: ${stringifyEntityRef(entity)}`);
      }
      await new FieldFormatEntityPolicy().enforce(entity);
      await saveEntity(database, entity);
      res.status(201).json(entity);
    } catch (error) {
      next(error);
    }
  });

  router.put('/hierarchy/:name', async (req, res, next) => {
    try {
      const access = await authorize(req, httpAuth, userInfo, true);
      if (!access.isValueSetManager) throw new NotAllowedError('Only administrators can manage value lists');
      const body = z.object({ title: z.string().trim().min(1) }).parse(req.body);
      const ref = `group:${DEFAULT_NAMESPACE}/${decodeURIComponent(req.params.name)}`;
      const entity = (await getManagedEntities(database)).find(
        item => stringifyEntityRef(item) === ref && typeof item.spec?.hierarchyKind === 'string',
      ) as GroupEntity | undefined;
      if (!entity) throw new NotFoundError(`Hierarchy value not found: ${ref}`);
      const updated: GroupEntity = {
        ...entity,
        metadata: { ...entity.metadata, title: body.title },
      };
      await saveEntity(database, updated, true);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/hierarchy/:name', async (req, res, next) => {
    try {
      const access = await authorize(req, httpAuth, userInfo, true);
      if (!access.isValueSetManager) throw new NotAllowedError('Only administrators can manage value lists');
      const ref = `group:${DEFAULT_NAMESPACE}/${decodeURIComponent(req.params.name)}`;
      const entities = await getManagedEntities(database);
      const target = entities.find(
        item => stringifyEntityRef(item) === ref && typeof item.spec?.hierarchyKind === 'string',
      );
      if (!target) throw new NotFoundError(`Hierarchy value not found: ${ref}`);
      const referenced = entities.some(entity => {
        if (entity.kind !== 'Group' || entity.spec?.type !== 'data-owner') return false;
        return ['administration', 'department', 'unit'].some(field =>
          entity.spec?.[field] === ref,
        );
      });
      const hasChildren = entities.some(entity => entity.spec?.parent === ref);
      if (referenced || hasChildren) {
        throw new InputError('This value is in use and cannot be deleted');
      }
      await database<StoredEntityRow>('geoportia_data_owner_entities')
        .where({ entity_ref: ref })
        .del();
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
