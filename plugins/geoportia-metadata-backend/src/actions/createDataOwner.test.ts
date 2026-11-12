import { readFile } from 'node:fs/promises';
import {
  createMockDirectory,
  mockServices,
} from '@backstage/backend-test-utils';
import { Entity, groupEntityV1alpha1Validator } from '@backstage/catalog-model';
import { InputError } from '@backstage/errors';
import { createMockActionContext } from '@backstage/plugin-scaffolder-node-test-utils';
import { parse } from 'yaml';
import {
  createCreateDataOwnerAction,
  CreateDataOwnerInput,
  CreateDataOwnerOutput,
} from './createDataOwner';

describe('geoportia:dataowner:create', () => {
  const workspace = createMockDirectory();
  const rootConfig = mockServices.rootConfig({
    data: { organization: { name: 'Eskilstuna' } },
  });
  const getEntityByRef = jest.fn();
  const catalogClient = { getEntityByRef };
  const auth = mockServices.auth();
  const getPluginRequestToken = jest
    .spyOn(auth, 'getPluginRequestToken')
    .mockResolvedValue({ token: 'catalog-token' });
  const action = createCreateDataOwnerAction({
    rootConfig,
    catalogClient,
    auth,
  });
  const createContext = (
    input: Pick<CreateDataOwnerInput, 'name'> & Partial<CreateDataOwnerInput>,
  ) =>
    createMockActionContext<CreateDataOwnerInput, CreateDataOwnerOutput>({
      workspacePath: workspace.path,
      input: {
        internalOrganisation: true,
        status: 'Godkänd',
        receiveReminders: true,
        ...input,
      },
    });
  const readEntity = async () =>
    parse(await readFile(workspace.resolve('catalog-info.yaml'), 'utf8'));
  const group = (name: string, parent?: string): Entity => ({
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Group',
    metadata: { name, namespace: 'default' },
    spec: {
      type: 'department',
      children: [],
      ...(parent && { parent }),
    },
  });

  beforeEach(() => {
    workspace.clear();
    getEntityByRef.mockReset();
    getPluginRequestToken.mockClear();
  });

  it('generates a valid standard Group and outputs its reference and file path', async () => {
    const ctx = createContext({
      name: 'gis-data-owner',
      displayName: 'GIS-dataägare',
      description: 'Ansvarig för kommunens geodata',
    });

    await action.handler(ctx);

    const entity = parse(
      await readFile(workspace.resolve('catalog-info.yaml'), 'utf8'),
    );
    expect(await groupEntityV1alpha1Validator.check(entity)).toBe(true);
    expect(entity).toEqual({
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Group',
      metadata: {
        name: 'gis-data-owner',
        namespace: 'default',
        title: 'GIS-dataägare',
        description: 'Ansvarig för kommunens geodata',
      },
      spec: {
        type: 'data-owner',
        profile: { displayName: 'GIS-dataägare' },
        children: [],
        internalOrganisation: true,
        organisationName: 'Eskilstuna',
        databaseUsers: [],
        status: 'Godkänd',
        receiveReminders: true,
        managementAgreementHistory: [],
      },
    });
    expect(ctx.output).toHaveBeenCalledWith(
      'entityRef',
      'group:default/gis-data-owner',
    );
    expect(ctx.output).toHaveBeenCalledWith(
      'catalogInfoPath',
      'catalog-info.yaml',
    );
  });

  it('defaults the display name to name and omits an unspecified description', async () => {
    await action.handler(createContext({ name: 'data-owner' }));

    const entity = parse(
      await readFile(workspace.resolve('catalog-info.yaml'), 'utf8'),
    );
    expect(entity.metadata.title).toBe('data-owner');
    expect(entity.metadata).not.toHaveProperty('description');
    expect(entity.spec.profile.displayName).toBe('data-owner');
  });

  it.each(['', ' ', 'invalid name', '../outside', 'a'.repeat(64)])(
    'rejects invalid entity name %j without writing a file',
    async name => {
      const ctx = createContext({ name });

      await expect(action.handler(ctx)).rejects.toThrow(InputError);
      expect(workspace.content()).toEqual({});
      expect(ctx.output).not.toHaveBeenCalled();
    },
  );

  it('does not overwrite an existing catalog file', async () => {
    workspace.setContent({ 'catalog-info.yaml': 'existing catalog content' });
    const ctx = createContext({ name: 'data-owner' });

    await expect(action.handler(ctx)).rejects.toMatchObject({ code: 'EEXIST' });
    expect(await readFile(workspace.resolve('catalog-info.yaml'), 'utf8')).toBe(
      'existing catalog content',
    );
    expect(ctx.output).not.toHaveBeenCalled();
  });

  it('supports scaffolder dry runs', async () => {
    expect(action.supportsDryRun).toBe(true);
    const ctx = createContext({ name: 'data-owner' });
    ctx.isDryRun = true;

    await action.handler(ctx);

    expect(ctx.output).toHaveBeenCalledWith(
      'entityRef',
      'group:default/data-owner',
    );
  });

  it('stores the full internal hierarchy, database users and responsible contact', async () => {
    const entities: Record<string, Entity> = {
      'group:default/administration': group('administration'),
      'group:default/department': group('department', 'administration'),
      'group:default/unit': group('unit', 'group:default/department'),
      'user:default/alice': {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'User',
        metadata: { name: 'alice', namespace: 'default' },
        spec: {
          profile: { displayName: 'Alice', email: 'alice@example.com' },
          memberOf: [],
        },
      },
    };
    getEntityByRef.mockImplementation(async (ref: string) => entities[ref]);
    const databaseUsers = [
      { platform: 'PostgreSQL', name: 'gis', description: 'GIS data owner' },
      { platform: 'ArcGIS SDE', name: 'gis', description: 'SDE data owner' },
    ];
    const ctx = createContext({
      name: 'data-owner',
      administration: 'administration',
      department: 'department',
      unit: 'unit',
      databaseUsers,
      responsible: 'alice',
      status: 'Aktiv',
      receiveReminders: false,
    });

    await action.handler(ctx);

    const entity = await readEntity();
    expect(await groupEntityV1alpha1Validator.check(entity)).toBe(true);
    expect(entity.spec).toMatchObject({
      internalOrganisation: true,
      organisationName: 'Eskilstuna',
      administration: 'group:default/administration',
      department: 'group:default/department',
      unit: 'group:default/unit',
      parent: 'group:default/unit',
      databaseUsers,
      responsible: 'user:default/alice',
      status: 'Aktiv',
      receiveReminders: false,
      managementAgreementHistory: [],
    });
    expect(entity.spec.profile).not.toHaveProperty('email');
    expect(getPluginRequestToken).toHaveBeenCalledTimes(1);
    expect(getPluginRequestToken).toHaveBeenCalledWith({
      onBehalfOf: await ctx.getInitiatorCredentials(),
      targetPluginId: 'catalog',
    });
    expect(getEntityByRef).toHaveBeenCalledWith('user:default/alice', {
      token: 'catalog-token',
    });
  });

  it('uses the configured internal organisation name rather than a hardcoded name', async () => {
    const otherAction = createCreateDataOwnerAction({
      rootConfig: mockServices.rootConfig({
        data: { organization: { name: 'Another municipality' } },
      }),
      catalogClient,
      auth,
    });

    await otherAction.handler(createContext({ name: 'data-owner' }));

    expect((await readEntity()).spec.organisationName).toBe(
      'Another municipality',
    );
  });

  it('requires an internal organisation name in config', async () => {
    const otherAction = createCreateDataOwnerAction({
      rootConfig: mockServices.rootConfig(),
      catalogClient,
      auth,
    });

    await expect(
      otherAction.handler(createContext({ name: 'data-owner' })),
    ).rejects.toThrow('organization.name must be configured');
    expect(workspace.content()).toEqual({});
  });

  it('stores the external organisation and email using the standard Group profile', async () => {
    await action.handler(
      createContext({
        name: 'external-owner',
        internalOrganisation: false,
        organisationName: 'External organisation',
        organisationEmail: 'contact@example.com',
      }),
    );

    const entity = await readEntity();
    expect(await groupEntityV1alpha1Validator.check(entity)).toBe(true);
    expect(entity.spec.organisationName).toBe('External organisation');
    expect(entity.spec.internalOrganisation).toBe(false);
    expect(entity.spec.profile.email).toBe('contact@example.com');
    expect(entity.spec).not.toHaveProperty('administration');
    expect(entity.spec).not.toHaveProperty('department');
    expect(entity.spec).not.toHaveProperty('unit');
    expect(entity.spec).not.toHaveProperty('parent');
    expect(getEntityByRef).not.toHaveBeenCalled();
  });

  it.each(['organisationName', 'organisationEmail'] as const)(
    'requires %s for external organisations',
    async field => {
      const ctx = createContext({
        name: 'data-owner',
        internalOrganisation: false,
        organisationName: 'External organisation',
        organisationEmail: 'contact@example.com',
      });
      delete ctx.input[field];

      await expect(action.handler(ctx)).rejects.toThrow(
        'External owners require',
      );
      expect(workspace.content()).toEqual({});
    },
  );

  it.each([
    { organisationName: 'Override' },
    { organisationEmail: 'contact@example.com' },
  ])('rejects external-only fields for internal owners: %j', async fields => {
    await expect(
      action.handler(createContext({ name: 'data-owner', ...fields })),
    ).rejects.toThrow('External organisation fields are not allowed');
  });

  it.each(['administration', 'department', 'unit'] as const)(
    'rejects external organisation hierarchy field %s',
    async field => {
      await expect(
        action.handler(
          createContext({
            name: 'data-owner',
            internalOrganisation: false,
            organisationName: 'External organisation',
            organisationEmail: 'contact@example.com',
            [field]: 'group:default/example',
          }),
        ),
      ).rejects.toThrow(
        'Organisation hierarchy is only allowed for internal owners',
      );
    },
  );

  it.each([
    [{ department: 'department' }, 'department requires administration'],
    [
      { administration: 'administration', unit: 'unit' },
      'unit requires department',
    ],
  ] as const)('rejects incomplete hierarchy %j', async (fields, message) => {
    await expect(
      action.handler(createContext({ name: 'data-owner', ...fields })),
    ).rejects.toThrow(message);
    expect(getEntityByRef).not.toHaveBeenCalled();
  });

  it.each(['department', 'unit'] as const)(
    'rejects a %s outside the selected parent group',
    async field => {
      const entities: Record<string, Entity> = {
        'group:default/administration': group('administration'),
        'group:default/department': group(
          'department',
          field === 'department' ? 'other' : 'administration',
        ),
        'group:default/unit': group('unit', 'other'),
      };
      getEntityByRef.mockImplementation(async (ref: string) => entities[ref]);

      await expect(
        action.handler(
          createContext({
            name: 'data-owner',
            administration: 'administration',
            department: 'department',
            ...(field === 'unit' && { unit: 'unit' }),
          }),
        ),
      ).rejects.toThrow(`${field} must belong to`);
      expect(workspace.content()).toEqual({});
    },
  );

  it('accepts a hierarchy recorded in the parent children list', async () => {
    const administration = group('administration');
    administration.spec = { ...administration.spec, children: ['department'] };
    getEntityByRef.mockImplementation(async (ref: string) =>
      ref === 'group:default/administration'
        ? administration
        : group('department'),
    );

    await action.handler(
      createContext({
        name: 'data-owner',
        administration: 'administration',
        department: 'department',
      }),
    );

    expect((await readEntity()).spec.parent).toBe('group:default/department');
  });

  it.each([
    [{ administration: 'missing' }, 'Group not found'],
    [{ responsible: 'missing' }, 'User not found'],
    [{ administration: 'user:default/alice' }, 'Invalid Group reference'],
    [{ responsible: 'group:default/team' }, 'Invalid User reference'],
  ])(
    'rejects missing or incorrectly typed catalog references %j',
    async (fields, message) => {
      await expect(
        action.handler(createContext({ name: 'data-owner', ...fields })),
      ).rejects.toThrow(message);
      expect(workspace.content()).toEqual({});
    },
  );

  it('propagates catalog failures without writing an entity', async () => {
    getEntityByRef.mockRejectedValue(new Error('Catalog unavailable'));

    await expect(
      action.handler(
        createContext({
          name: 'data-owner',
          responsible: 'alice',
        }),
      ),
    ).rejects.toThrow('Catalog unavailable');
    expect(workspace.content()).toEqual({});
  });

  it.each([true, false])(
    'stores receiveReminders=%s without inverting it',
    async value => {
      await action.handler(
        createContext({ name: 'data-owner', receiveReminders: value }),
      );

      expect((await readEntity()).spec.receiveReminders).toBe(value);
    },
  );

  it.each(['internalOrganisation', 'status', 'receiveReminders'] as const)(
    'requires an explicit %s',
    async field => {
      const ctx = createContext({ name: 'data-owner' });
      delete (ctx.input as Partial<CreateDataOwnerInput>)[field];

      await expect(action.handler(ctx)).rejects.toThrow(InputError);
      expect(workspace.content()).toEqual({});
    },
  );

  it('rejects duplicate database users on the same platform', async () => {
    await expect(
      action.handler(
        createContext({
          name: 'data-owner',
          databaseUsers: [
            { platform: 'PostgreSQL', name: 'gis' },
            {
              platform: 'postgresql',
              name: 'gis',
              description: 'Same account',
            },
          ],
        }),
      ),
    ).rejects.toThrow('Duplicate database user');
    expect(workspace.content()).toEqual({});
  });

  it.each([
    { status: ' ' },
    { receiveReminders: 'true' },
    { internalOrganisation: 'false' },
    { organisationEmail: 'not-an-email' },
    { databaseUsers: [{ name: 'gis' }] },
    { databaseUsers: [{ platform: ' ', name: 'gis' }] },
    { databaseUsers: [{ platform: 'PostgreSQL', name: '' }] },
    {
      databaseUsers: [
        { platform: 'PostgreSQL', name: 'gis', password: 'not-allowed' },
      ],
    },
    { managementAgreementHistory: [{ date: 'unconfirmed-format' }] },
  ])('rejects invalid field values %j', async fields => {
    const ctx = createContext({ name: 'data-owner' });
    ctx.input = { ...ctx.input, ...fields } as unknown as CreateDataOwnerInput;

    await expect(action.handler(ctx)).rejects.toThrow(InputError);
    expect(workspace.content()).toEqual({});
  });

  it('initialises explicitly supplied agreement history as empty', async () => {
    await action.handler(
      createContext({ name: 'data-owner', managementAgreementHistory: [] }),
    );

    expect((await readEntity()).spec.managementAgreementHistory).toEqual([]);
  });
});
