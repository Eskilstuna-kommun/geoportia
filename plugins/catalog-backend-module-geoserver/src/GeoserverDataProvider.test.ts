import { GeoServerRestClient } from 'geoserver-rest-client';
import { GeoserverDataProvider } from './GeoserverDataProvider';

jest.mock('geoserver-rest-client', () => ({
  GeoServerRestClient: jest.fn(),
}));

type MockedFn = jest.Mock<any, any>;

describe('GeoserverDataProvider workspace ignore list', () => {
  const GeoServerRestClientMock = GeoServerRestClient as unknown as MockedFn;

  const makeLogger = () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  });

  const makeTaskRunner = () => ({
    run: jest.fn(async ({ fn }: any) => fn()),
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('filters ignored workspaces before fetching datastores/layers', async () => {
    const mockClient: any = {
      workspaces: {
        getAll: jest.fn(async () => ({
          workspaces: {
            workspace: [
              { name: 'Public', href: 'http://example/workspaces/public' },
              { name: 'Internal', href: 'http://example/workspaces/internal' },
            ],
          },
        })),
      },
      datastores: {
        getDataStores: jest.fn(async () => ({
          dataStores: { dataStore: [] },
        })),
        getCoverageStores: jest.fn(async () => ({
          coverageStores: { coverageStore: [] },
        })),
        getWmsStores: jest.fn(async () => ({
          wmsStores: { wmsStore: [] },
        })),
        getWmtsStores: jest.fn(async () => ({
          wmtStores: { wmtStore: [] },
        })),
        // These should not be called in this test (no stores returned)
        getDataStore: jest.fn(async () => ({})),
        getCoverageStore: jest.fn(async () => ({})),
        getWmsStore: jest.fn(async () => ({})),
        getWmtsStore: jest.fn(async () => ({})),
      },
      layers: {
        getLayers: jest.fn(async () => ({ layers: { layer: [] } })),
        get: jest.fn(async () => ({})),
        getDataStore: jest.fn(async () => ({})),
        getCoverageStore: jest.fn(async () => ({})),
        getWMSStore: jest.fn(async () => ({})),
        getWMTSStore: jest.fn(async () => ({})),
      },
    };

    GeoServerRestClientMock.mockImplementation(() => mockClient);

    const logger = makeLogger();
    const taskRunner = makeTaskRunner();

    const provider = new GeoserverDataProvider(
      'http://example/geoserver/rest',
      'user',
      'pass',
      ['internal'],
      taskRunner as any,
      logger as any,
    );

    const applyMutation = jest.fn(async () => undefined);
    (provider as any).connection = { applyMutation };

    await provider.run();

    expect(mockClient.workspaces.getAll).toHaveBeenCalledTimes(1);

    // Only the non-ignored workspace should be processed
    expect(mockClient.datastores.getDataStores).toHaveBeenCalledTimes(1);
    expect(mockClient.datastores.getDataStores).toHaveBeenCalledWith('Public');
    expect(mockClient.layers.getLayers).toHaveBeenCalledTimes(1);
    expect(mockClient.layers.getLayers).toHaveBeenCalledWith('Public');

    // Full mutation should still be applied (even if entity list is empty)
    expect(applyMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'full',
        entities: expect.any(Array),
      }),
    );
  });

  it('does not call datastore/layer APIs when all workspaces are ignored', async () => {
    const mockClient: any = {
      workspaces: {
        getAll: jest.fn(async () => ({
          workspaces: {
            workspace: [
              { name: 'A', href: 'http://example/workspaces/a' },
              { name: 'B', href: 'http://example/workspaces/b' },
            ],
          },
        })),
      },
      datastores: {
        getDataStores: jest.fn(() => {
          throw new Error('should not be called');
        }),
        getCoverageStores: jest.fn(() => {
          throw new Error('should not be called');
        }),
        getWmsStores: jest.fn(() => {
          throw new Error('should not be called');
        }),
        getWmtsStores: jest.fn(() => {
          throw new Error('should not be called');
        }),
      },
      layers: {
        getLayers: jest.fn(() => {
          throw new Error('should not be called');
        }),
      },
    };

    GeoServerRestClientMock.mockImplementation(() => mockClient);

    const logger = makeLogger();
    const taskRunner = makeTaskRunner();

    const provider = new GeoserverDataProvider(
      'http://example/geoserver/rest',
      'user',
      'pass',
      ['a', 'b'],
      taskRunner as any,
      logger as any,
    );

    const applyMutation = jest.fn(async () => undefined);
    (provider as any).connection = { applyMutation };

    await provider.run();

    expect(mockClient.workspaces.getAll).toHaveBeenCalledTimes(1);
    expect(applyMutation).toHaveBeenCalledTimes(1);
  });
});
