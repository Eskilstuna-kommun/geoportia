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
import { createHash } from 'node:crypto';

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

  /**
   * Converts a database object name into a Backstage-compliant identifier-like string.
   *
   * Note: In this provider, the *original* database name is kept as `metadata.name`.
   * The converted variant is used as `metadata.title`, to align with the naming
   * strategy used by the other data providers.
   */
  private convertNameToBackstageCompliant(name: string): string {
    const normalizedName = `${name ?? ''}`;
    const shortHash = createHash('md5')
      .update(normalizedName, 'utf8')
      .digest('hex')
      .substring(0, 4);

    // Keep the same 58+"-"+4 pattern as other providers.
    return (
      normalizedName.substring(0, 58).replace(/[^a-zA-Z0-9._-]/g, '_') +
      '-' +
      shortHash
    );
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
    _schemaName: string,
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
        title: this.convertNameToBackstageCompliant(entityName),
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
          this.loggerService.debug(
            `Entity ${entityName} of type ${entityType} was added or modified, updating catalog.`,
          );
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
          this.loggerService.debug(
            `Entity ${entityName} of type ${entityType} was added or modified, re-running extraction.`,
          );
          // We can only delta-update tables at present. If the type is something else, we re-run the extraction instead.
          await this.run();
        }

        break;
      case 'DROP':
        this.loggerService.debug(
          `Entity ${entityName} of type ${entityType} was dropped, removing from catalog.`,
        );
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

      case 'FULL':
        this.loggerService.debug(
          'Request for full update received, re-running extraction.',
        );
        // A full update was requested. Re-run the extraction.
        await this.run();

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
              title: this.convertNameToBackstageCompliant(
                `${schemaName}.${table.name}`,
              ),
              evenName: table.name.length % 2 === 0 ? 'true' : 'false',
              longName: table.name.length > 5 ? 'true' : 'false',
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
              title: this.convertNameToBackstageCompliant(
                `${schemaName}.${view.name}`,
              ),
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
