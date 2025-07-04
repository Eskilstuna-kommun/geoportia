import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { LoggerService, SchedulerServiceTaskRunner } from '@backstage/backend-plugin-api';
import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  Entity,
} from '@backstage/catalog-model';
import {
  DatabaseRelation,
  extractDatabaseRelationsFromLogEntries,
  FMEWorkspaceEntity,
} from '@internal/fmeflow-common';
import {
  CompletedWorkspaceJob,
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
  
    const jobLogsMap = new Map<string, DatabaseRelation>();
  
    // 1. Fetch completed jobs
    let completedJobs: CompletedWorkspaceJob[] = [];
    try {
      completedJobs = await this.client.fetchCompletedJobs();
    } catch (error) {
      this.logger.warn('Failed to get completed jobs: ' + JSON.stringify(error));
      return;
    }
  
    // 2. Extract DB relations from logs
    for (const job of completedJobs) {
      if (!job.workspace) continue;
      try {
        const logData = await this.client.fetchLogsForJob(job.id);
        const relations = extractDatabaseRelationsFromLogEntries(logData.items);
        jobLogsMap.set(job.workspace, relations);
      } catch (err) {
        this.logger.warn(`Failed to fetch/parse logs for job ${job.id}: ${err}`);
      }
    }
  
    // 3. Fetch repository workspaces
    let data: FMEFlowItem[] = [];
    try {
      data = await this.client.fetchRepositoryItems();
    } catch (error) {
      this.logger.warn('Failed to fetch from FME Flow: ' + JSON.stringify(error));
      return;
    }
  
    // 4. Build ALL entities
    const entities: Entity[] = data.flatMap(item => {
      if (!item.name) return [];
  
      const name = item.name.toLowerCase().replace(/[^a-z0-9\-]/g, '');
      const dbRelations = jobLogsMap.get(item.name);
  
      const workspaceEntity: FMEWorkspaceEntity = {
        apiVersion: 'geoportia.se/v1alpha1',
        kind: 'FMEWorkspace',
        metadata: {
          name,
          namespace: 'default',
          title: item.title || item.name,
          description: item.description?.replace(/<\/?[^>]+>/g, '') ?? '',
          annotations: {
            [ANNOTATION_LOCATION]: `url:${this.client['baseUrl']}`,
            [ANNOTATION_ORIGIN_LOCATION]: `url:${this.client['baseUrl']}`,
            ...(dbRelations?.database && { 'fmeflow/database': dbRelations.database }),
            ...(dbRelations?.dataset && { 'fmeflow/dataset': dbRelations.dataset }),
          },
        },
        spec: {
          type: item.type ?? 'fme-workspace',
          lastUpdated: item.lastPublishDate,
          ...(dbRelations?.tables?.length && { tables: dbRelations.tables }),
        },
      };
  
      const cleanDbName = dbRelations?.database
        ?.toLowerCase()
        .replace(/[`]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '');

    const dbEntity: Entity | undefined = cleanDbName
      ? {
          apiVersion: 'geoportia.se/v1alpha1',
          kind: 'Resource',
          metadata: {
            name: cleanDbName,
            title: dbRelations?.database,
            namespace: 'default',
            annotations: {
              [ANNOTATION_LOCATION]: `url:${this.client['baseUrl']}`,
              [ANNOTATION_ORIGIN_LOCATION]: `url:${this.client['baseUrl']}`,
            },
          },
          spec: {
            type: 'database',
          },
        }
      : undefined;
        
      const tableEntities: Entity[] =
        dbRelations?.tables?.map(t => ({
          apiVersion: 'geoportia.se/v1alpha1',
          kind: 'Table',
          metadata: {
            name: `${t.schema}.${t.table}`.toLowerCase(),
            namespace: 'default',
            title: t.table,
            annotations: {
              [ANNOTATION_LOCATION]: `url:${this.client['baseUrl']}`,
              [ANNOTATION_ORIGIN_LOCATION]: `url:${this.client['baseUrl']}`,
            },
          },
          spec: {
            schema: t.schema,
            lifecycle: 'production',
          },
        })) ?? [];
  
      return [
        workspaceEntity,
        ...(dbEntity ? [dbEntity] : []),
        ...tableEntities,
      ];
    });

    await this.connection.applyMutation({
      type: 'full',
      entities: entities.map(entity => ({
        entity,
        locationKey: this.getProviderName(),
      })),
    });
  }
}
