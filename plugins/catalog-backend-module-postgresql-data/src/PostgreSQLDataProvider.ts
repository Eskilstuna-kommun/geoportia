import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import {
  LoggerService,
  SchedulerServiceTaskRunner,
} from '@backstage/backend-plugin-api';
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
    private loggerService: LoggerService,
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
    await this.run();
  }

  async update(
    updateType: string,
    entityType: string,
    entityName: string,
    schemaName: string,
    comment?: string,
  ) {
    if (!this.connection) {
      throw new Error('Not initialized');
    }

    // Check that the entity type is one of the supported types
    if (entityType.toLowerCase() === 'table') {
      entityType = 'Table';
    } else if (entityType.toLowerCase() === 'view') {
      entityType = 'View';
    } else {
      this.loggerService.debug(
        `Unsupported entity type: ${entityType}. Only 'table' and 'view' are supported.`,
      );
      return;
    }

    const entity: Entity = {
      apiVersion: 'geoportia.se/v1alpha1',
      kind: entityType,
      metadata: {
        name: entityName,
        title: entityName.replace(schemaName + '.', ''),
        description: comment || undefined,
        annotations: {
          [ANNOTATION_LOCATION]: this.uri,
          [ANNOTATION_ORIGIN_LOCATION]: this.uri,
        },
      },
    };

    switch (updateType) {
      case 'ALTER':
        if (entityType.toLowerCase() === 'table') {
          await this.connection.applyMutation({
            type: 'delta',
            added: [
              {
                entity,
                locationKey: this.getProviderName(),
              },
            ],
            removed: [],
          });
        } else {
          // We can only delta-update tables at present. If the type is something else, we re-run the extraction instead.
          await this.run();
        }

        break;
      case 'DROP':
        await this.connection.applyMutation({
          type: 'delta',
          added: [],
          removed: [
            {
              entity,
              locationKey: this.getProviderName(),
            },
          ],
        });

        break;

      default:
        // If we get a non-implemented update type, we re-run the extraction.
        this.loggerService.warn('Unknown update type, re-running extraction!');
        await this.run();
    }
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
