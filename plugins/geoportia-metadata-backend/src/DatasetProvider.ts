import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import {
  DiscoveryService,
  LoggerService,
  SchedulerServiceTaskRunner,
} from '@backstage/backend-plugin-api';
import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  Entity,
} from '@backstage/catalog-model';

const PROVIDER_NAME = 'geoportia-dataset-provider';

interface DatasetApiResponse {
  id: number;
  name: string;
  summary: string | null;
  versioning: string;
  allow_z_values: boolean;
  status: string;
  created_at: string;
}

export class DatasetProvider implements EntityProvider {
  private connection?: EntityProviderConnection;

  constructor(
    private readonly discovery: DiscoveryService,
    private readonly taskRunner: SchedulerServiceTaskRunner,
    private readonly logger: LoggerService,
  ) {}

  getProviderName(): string {
    return PROVIDER_NAME;
  }

  async connect(connection: EntityProviderConnection) {
    this.connection = connection;
    await this.taskRunner.run({
      id: this.getProviderName(),
      fn: async () => {
        await this.run();
      },
    });
    await this.run();
  }

  async run() {
    if (!this.connection) {
      throw new Error('DatasetProvider not initialized');
    }

    this.logger.info('DatasetProvider: fetching datasets from API');

    let datasets: DatasetApiResponse[] = [];
    try {
      const baseUrl = await this.discovery.getBaseUrl('geoportia-metadata');
      const response = await fetch(`${baseUrl}/datasets`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch datasets: ${response.status}`);
      }
      
      datasets = await response.json();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `DatasetProvider: failed to fetch datasets: ${errorMessage}`,
      );
      return;
    }

    const entities: Entity[] = datasets.map(dataset => this.datasetToEntity(dataset));

    this.logger.info(
      `DatasetProvider: providing ${entities.length} Dataset entities`,
    );

    await this.connection.applyMutation({
      type: 'full',
      entities: entities.map(entity => ({
        entity,
        locationKey: this.getProviderName(),
      })),
    });
  }

  private datasetToEntity(dataset: DatasetApiResponse): Entity {
    const entity: Entity = {
      apiVersion: 'geoportia.se/v1alpha1',
      kind: 'Dataset',
      metadata: {
        name: dataset.name,
        namespace: 'default',
        title: dataset.name,
        description: dataset.summary || undefined,
        annotations: {
          [ANNOTATION_LOCATION]: `geoportia-dataset:${dataset.name}`,
          [ANNOTATION_ORIGIN_LOCATION]: `geoportia-dataset:${dataset.name}`,
        },
      },
      spec: {
        summary: dataset.summary || undefined,
        versioning: dataset.versioning,
        allowZValues: dataset.allow_z_values,
        status: dataset.status,
      },
    };

    return entity;
  }
}
