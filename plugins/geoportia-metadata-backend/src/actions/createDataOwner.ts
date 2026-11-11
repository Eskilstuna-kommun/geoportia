import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AuthService, RootConfigService } from '@backstage/backend-plugin-api';
import { CatalogClient } from '@backstage/catalog-client';
import {
  DEFAULT_NAMESPACE,
  Entity,
  FieldFormatEntityPolicy,
  GroupEntity,
  parseEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { InputError } from '@backstage/errors';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { stringify } from 'yaml';
import * as z from 'zod';

const nonEmptyString = z.string().trim().min(1);

export const inputSchema = z
  .object({
    name: nonEmptyString.describe(
      'A Backstage-compatible catalog entity name.',
    ),
    displayName: nonEmptyString.optional().describe('Defaults to name.'),
    description: z.string().optional(),
    internalOrganisation: z
      .boolean()
      .describe(
        'Whether the data owner belongs to the configured internal organisation.',
      ),
    organisationName: nonEmptyString
      .optional()
      .describe(
        'External organisation name. Internal owners use organization.name from config.',
      ),
    organisationEmail: z
      .email()
      .optional()
      .describe(
        'External organisation email. Not accepted for internal owners.',
      ),
    administration: nonEmptyString
      .optional()
      .describe('Internal administration Group reference (Förvaltning).'),
    department: nonEmptyString
      .optional()
      .describe(
        'Department/area Group reference, a child of the selected administration.',
      ),
    unit: nonEmptyString
      .optional()
      .describe(
        'Unit Group reference, a child of the selected department/area.',
      ),
    databaseUsers: z
      .array(
        z
          .object({
            platform: nonEmptyString.describe(
              'Database platform, for example PostgreSQL.',
            ),
            name: nonEmptyString.describe(
              'Database user name, not a password.',
            ),
            description: z.string().optional(),
          })
          .strict(),
      )
      .default([])
      .describe(
        'Selected database users, including the platform and description for display. Never include credentials.',
      ),
    responsible: nonEmptyString
      .optional()
      .describe(
        'Responsible contact as a catalog User reference. AD/contact details remain on the User entity.',
      ),
    status: nonEmptyString.describe(
      'Data-owner status; no domain enum is assumed.',
    ),
    receiveReminders: z
      .boolean()
      .describe(
        'Positive semantics: true means receive reminders. A legacy opt-out flag must be inverted before use.',
      ),
    managementAgreementHistory: z
      .tuple([])
      .default([])
      .describe(
        'New data owners start with empty history. Legacy history import awaits confirmation of its format.',
      ),
  })
  .strict();

export type CreateDataOwnerInput = z.input<typeof inputSchema>;

export interface CreateDataOwnerActionOptions {
  rootConfig: RootConfigService;
  catalogClient: Pick<CatalogClient, 'getEntityByRef'>;
  auth: AuthService;
}

export type CreateDataOwnerOutput = {
  entityRef: string;
  catalogInfoPath: string;
};

function normalizeRef(
  value: string,
  kind: string,
  namespace = DEFAULT_NAMESPACE,
) {
  try {
    const ref = parseEntityRef(value, {
      defaultKind: kind,
      defaultNamespace: namespace,
    });
    if (ref.kind.toLowerCase() !== kind.toLowerCase()) {
      throw new Error(`Expected kind ${kind}`);
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
    return (
      normalizeRef(child.spec.parent, 'Group', child.metadata.namespace) ===
      parentRef
    );
  }
  return Boolean(
    child.relations?.some(
      relation =>
        relation.type === 'childOf' && relation.targetRef === parentRef,
    ) ||
      (Array.isArray(parent.spec?.children) &&
        parent.spec.children.some(
          ref =>
            typeof ref === 'string' &&
            normalizeRef(ref, 'Group', parent.metadata.namespace) === childRef,
        )),
  );
}

/** Generates a data-owner Group for subsequent built-in publish/register steps. */
export function createCreateDataOwnerAction(
  options: CreateDataOwnerActionOptions,
) {
  const { rootConfig, catalogClient, auth } = options;

  return createTemplateAction<CreateDataOwnerInput, CreateDataOwnerOutput>({
    id: 'geoportia:dataowner:create',
    description:
      'Writes a data-owner Group to catalog-info.yaml in the task workspace. Use built-in publish and catalog:register actions to add it to the catalog.',
    supportsDryRun: true,
    schema: {
      input: z.toJSONSchema(inputSchema, { target: 'draft-7', io: 'input' }),
      output: {
        type: 'object',
        required: ['entityRef', 'catalogInfoPath'],
        properties: {
          entityRef: {
            type: 'string',
            description: 'The entity reference of the generated Group.',
          },
          catalogInfoPath: {
            type: 'string',
            description:
              'The catalog file path relative to the task workspace.',
          },
        },
      },
    },
    async handler(ctx) {
      const result = inputSchema.safeParse(ctx.input);
      if (!result.success) {
        throw new InputError(
          `Invalid data-owner input: ${result.error.message}`,
        );
      }
      const input = result.data;
      const {
        name,
        displayName = name,
        description,
        internalOrganisation,
        databaseUsers,
        status,
        receiveReminders,
        managementAgreementHistory,
      } = input;

      let organisationName: string;
      if (internalOrganisation) {
        if (
          input.organisationName !== undefined ||
          input.organisationEmail !== undefined
        ) {
          throw new InputError(
            'External organisation fields are not allowed for internal owners',
          );
        }
        const configuredName = rootConfig
          .getOptionalString('organization.name')
          ?.trim();
        if (!configuredName) {
          throw new InputError(
            'organization.name must be configured for internal owners',
          );
        }
        organisationName = configuredName;
      } else {
        if (!input.organisationName || !input.organisationEmail) {
          throw new InputError(
            'External owners require organisationName and organisationEmail',
          );
        }
        if (input.administration || input.department || input.unit) {
          throw new InputError(
            'Organisation hierarchy is only allowed for internal owners',
          );
        }
        organisationName = input.organisationName;
      }

      if (input.department && !input.administration) {
        throw new InputError('department requires administration');
      }
      if (input.unit && !input.department) {
        throw new InputError('unit requires department');
      }

      const userKeys = new Set<string>();
      for (const user of databaseUsers) {
        const key = JSON.stringify([user.platform.toLowerCase(), user.name]);
        if (userKeys.has(key)) {
          throw new InputError(
            `Duplicate database user: ${user.platform}/${user.name}`,
          );
        }
        userKeys.add(key);
      }

      let catalogToken: string | undefined;
      const getCatalogEntity = async (value: string, kind: string) => {
        const ref = normalizeRef(value, kind);
        if (!catalogToken) {
          const response = await auth.getPluginRequestToken({
            onBehalfOf: await ctx.getInitiatorCredentials(),
            targetPluginId: 'catalog',
          });
          catalogToken = response.token;
        }
        const entity = await catalogClient.getEntityByRef(ref, {
          token: catalogToken,
        });
        if (!entity || entity.kind.toLowerCase() !== kind.toLowerCase()) {
          throw new InputError(`${kind} not found in catalog: ${ref}`);
        }
        return entity;
      };

      const hierarchy: Partial<
        Record<'administration' | 'department' | 'unit', string>
      > = {};
      let parent: Entity | undefined;
      for (const field of ['administration', 'department', 'unit'] as const) {
        const value = input[field];
        if (!value) continue;
        const group = await getCatalogEntity(value, 'Group');
        if (parent && !isChildOf(group, parent)) {
          throw new InputError(
            `${field} must belong to ${stringifyEntityRef(parent)}`,
          );
        }
        hierarchy[field] = stringifyEntityRef(group);
        parent = group;
      }

      const responsible = input.responsible
        ? stringifyEntityRef(await getCatalogEntity(input.responsible, 'User'))
        : undefined;

      const spec = {
        type: 'data-owner',
        profile: {
          displayName,
          ...(!internalOrganisation && { email: input.organisationEmail }),
        },
        children: [],
        ...(parent && { parent: stringifyEntityRef(parent) }),
        internalOrganisation,
        organisationName,
        ...hierarchy,
        databaseUsers,
        ...(responsible && { responsible }),
        status,
        receiveReminders,
        managementAgreementHistory,
      };

      const entity: GroupEntity = {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Group',
        metadata: {
          name,
          namespace: DEFAULT_NAMESPACE,
          title: displayName,
          ...(description !== undefined && { description }),
        },
        spec,
      };

      try {
        await new FieldFormatEntityPolicy().enforce(entity);
      } catch (error) {
        throw new InputError('Invalid data-owner entity', error);
      }

      const catalogInfoPath = 'catalog-info.yaml';
      await writeFile(
        join(ctx.workspacePath, catalogInfoPath),
        stringify(entity),
        { encoding: 'utf8', flag: 'wx' },
      );

      const entityRef = stringifyEntityRef(entity);
      ctx.logger.info(`Generated data-owner entity ${entityRef}`);
      ctx.output('entityRef', entityRef);
      ctx.output('catalogInfoPath', catalogInfoPath);
    },
  });
}
