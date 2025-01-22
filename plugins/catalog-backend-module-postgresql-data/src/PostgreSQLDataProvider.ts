import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { SchedulerServiceTaskRunner } from '@backstage/backend-plugin-api';
import { extractSchemas } from 'extract-pg-schema';
import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  Entity,
} from '@backstage/catalog-model';

export class PostgreSQLDataProvider implements EntityProvider {
  private connection?: EntityProviderConnection;

  constructor(
    private uri: string,
    private taskRunner: SchedulerServiceTaskRunner,
  ) {}

  getProviderName(): string {
    return `postgresql-data-${this.uri}`;
  }

  async connect(connection: EntityProviderConnection) {
    this.connection = connection;
    await this.taskRunner.run({
      id: this.getProviderName(),
      fn: async () => {
        await this.run();
      },
    });
  }

  async run() {
    if (!this.connection) {
      throw new Error('Not initialized');
    }

    const extracted = await extractSchemas(this.uri);

    const entities = Object.entries(extracted).flatMap(
      ([schemaName, schema]) => [
        ...schema.tables.map(
          (table): Entity => ({
            apiVersion: 'geoportia.se/v1alpha1',
            kind: 'Table',
            metadata: {
              name: `${schemaName}.${table.name}`,
              title: table.name,
              description: table.comment || undefined,
              annotations: {
                [ANNOTATION_LOCATION]: this.uri,
                [ANNOTATION_ORIGIN_LOCATION]: this.uri,
              },
            },
            spec: table as any,
          }),
        ),
        ...schema.views.map(
          (view): Entity => ({
            apiVersion: 'geoportia.se/v1alpha1',
            kind: 'View',
            metadata: {
              name: `${schemaName}.${view.name}`,
              title: view.name,
              description: view.comment || undefined,
              annotations: {
                [ANNOTATION_LOCATION]: this.uri,
                [ANNOTATION_ORIGIN_LOCATION]: this.uri,
              },
            },
            spec: view as any,
          }),
        ),
      ],
    );

    await this.connection.applyMutation({
      type: 'full',
      entities: entities.map(entity => ({
        entity,
        locationKey: this.getProviderName(),
      })),
    });
  }
}
