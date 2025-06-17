import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { LoggerService, SchedulerServiceTaskRunner } from '@backstage/backend-plugin-api';
import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
} from '@backstage/catalog-model';
import {
  FMEWorkspaceEntity,
  isFMEWorkspaceEntity,
} from '@internal/fmeflow-common';
import {
  FMEFlowClient,
  FMEFlowItem,
} from '@internal/backstage-plugin-fmeflow-api-client-node';

interface FMEFlowEntityProviderOptions {
  logger: LoggerService;
  baseUrl: string;
  repository: string;
  token?: string;
  taskRunner: SchedulerServiceTaskRunner;
}

export class FMEFlowEntityProvider implements EntityProvider {
  private connection?: EntityProviderConnection;
  private readonly logger: LoggerService;
  private readonly taskRunner: SchedulerServiceTaskRunner;
  private readonly client: FMEFlowClient;

  constructor(options: FMEFlowEntityProviderOptions) {
    this.logger = options.logger;
    this.taskRunner = options.taskRunner;
    this.client = new FMEFlowClient({
      baseUrl: options.baseUrl,
      repository: options.repository,
      token: options.token,
    });
  }

  getProviderName(): string {
    return `fmeflow-provider-${this.client['baseUrl']}`;
  }

  async connect(connection: EntityProviderConnection) {
    this.connection = connection;
    await this.taskRunner.run({
      id: this.getProviderName(),
      fn: async () => {
        await this.run();
      },
    });
    await this.run(); // First run immediately
  }

  async run() {
    if (!this.connection) {
      throw new Error('FMEFlowEntityProvider is not connected');
    }
  
    let data: FMEFlowItem[] = [];
    try {
      data = await this.client.fetchRepositoryItems();
    } catch (error) {
      this.logger.warn('Failed to fetch from FME Flow: ' + JSON.stringify(error));
      return;
    }
  
    const entities: FMEWorkspaceEntity[] = data
      .map(item => {
        const cleanName = item.name
          ?.replace(/\.fmw$/, '')
          .toLowerCase()
          .replace(/[^a-z0-9\-]/g, '');

        if (!cleanName) return undefined;

        const entity: FMEWorkspaceEntity = {
          apiVersion: 'geoportia.se/v1alpha1',
          kind: 'FMEWorkspace',
          metadata: {
            name: cleanName,
            title: item.title ?? cleanName,
            description: item.description?.replace(/<\/?[^>]+>/g, '') ?? '',
            annotations: {
              [ANNOTATION_LOCATION]: `url:${this.client['baseUrl']}`,
              [ANNOTATION_ORIGIN_LOCATION]: `url:${this.client['baseUrl']}`,
            },
          },
          spec: {
            type: item.type ?? 'fme-workspace',
            lastUpdated: item.lastPublishDate,
            lifecycle: 'production',
            owner: 'data-team',
          },
        };

        if (!isFMEWorkspaceEntity(entity)) {
          this.logger.warn('Invalid FMEWorkspaceEntity generated: ' + JSON.stringify(entity));
          return undefined;
        }

        return entity;
      })
      .filter((e): e is FMEWorkspaceEntity => e !== undefined);
  
    await this.connection.applyMutation({
      type: 'full',
      entities: entities.map(entity => ({
        entity,
        locationKey: this.getProviderName(),
      })),
    });
  }
  
}
