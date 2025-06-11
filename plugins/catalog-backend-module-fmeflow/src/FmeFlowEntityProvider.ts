import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { SchedulerServiceTaskRunner } from '@backstage/backend-plugin-api';
import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  Entity,
} from '@backstage/catalog-model';

type FmeFlowEntityProviderOptions = {
  baseUrl: string;
  token?: string;
  taskRunner: SchedulerServiceTaskRunner;
};

export class FmeFlowEntityProvider implements EntityProvider {
  private connection?: EntityProviderConnection;
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly taskRunner: SchedulerServiceTaskRunner;

  constructor(options: FmeFlowEntityProviderOptions) {
    this.baseUrl = options.baseUrl;
    this.token = options.token;
    this.taskRunner = options.taskRunner;
  }

  getProviderName(): string {
    return `fmeflow-provider-${this.baseUrl}`;
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
      throw new Error('FmeFlowEntityProvider is not connected');
    }
  
    let data: any[] = [];
    try {
      data = await this.fetchFmeFlowData();
    } catch (error) {
      console.error('❌ Failed to fetch from FME Flow:', error);
      return;
    }
  
    const entities: Entity[] = [];
  
    for (const item of data) {
      const cleanName = item.name
        ?.replace(/\.fmw$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9\-]/g, '');
  
      if (!cleanName) continue;
  
      const entity: Entity = {
        apiVersion: 'geoportia.se/v1alpha1',
        kind: 'FmeWorkspace',
        metadata: {
          name: cleanName,
          title: item.title ?? cleanName,
          description: item.description?.replace(/<\/?[^>]+>/g, '') ?? '',
          annotations: {
            [ANNOTATION_LOCATION]: `url:${this.baseUrl}`,
            [ANNOTATION_ORIGIN_LOCATION]: `url:${this.baseUrl}`,
          },
        },
        spec: {
          type: 'service',
          lifecycle: 'production',
          owner: 'user:default/data-team',
        },
      };
  
      entities.push(entity);
    }
  
    await this.connection.applyMutation({
      type: 'full',
      entities: entities.map(entity => ({
        entity,
        locationKey: this.getProviderName(),
      })),
    });
  }
  

  private async fetchFmeFlowData(): Promise<any[]> {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

    const url = `${this.baseUrl}/repositories/Samples/items?type=WORKSPACE`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: this.token ? `fmetoken token=${this.token}` : '',
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(
        `FME Flow API call failed [${res.status} ${res.statusText}] — ${errorBody}`,
      );
    }

    const json = await res.json();
    return json.items || [];
  }
}
