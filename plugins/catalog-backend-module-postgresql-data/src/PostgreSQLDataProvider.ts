import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import {
  LoggerService,
  SchedulerServiceTaskRunner,
} from '@backstage/backend-plugin-api';
import { extractSchemas, ViewColumn } from 'extract-pg-schema';
import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  Entity,
} from '@backstage/catalog-model';
import { convertNameToBackstageCompliant as toBackstageCompliantName } from '@internal/backstage-plugin-entity-name-common';
import {
  PostgreSQLSchemaEntity,
  PostgreSQLTableEntity,
  PostgreSQLViewEntity,
} from '@internal/postgresql-data-common';
import { PostgreSQLSchemasProvider } from './PostgreSQLSchemasProvider';

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
        name: toBackstageCompliantName(entityName),
        title: entityName,
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

    const postgresSchemasProvider = new PostgreSQLSchemasProvider(this.uri);
    const schemasMap = await postgresSchemasProvider.getSchemasMap();

    const viewTableMap = new Map<string, string>();

    const defaultNamespace = 'default';

    const entities = Object.entries(extracted).flatMap(
      ([schemaName, schema]) => [
        {
          apiVersion: 'geoportia.se/v1alpha1',
          kind: 'Schema',
          metadata: {
            name: toBackstageCompliantName(schemaName),
            namespace: defaultNamespace,
            owner: schemasMap.get(schemaName) || undefined,
            title: schemaName,
            annotations: {
              [ANNOTATION_LOCATION]: this.uri,
              [ANNOTATION_ORIGIN_LOCATION]: this.uri,
            },
          },
          spec: {
            dialect: 'postgresql',
            dependencyOf: [
              ...schema.tables.map(table => ({
                kind: 'Table',
                namespace: defaultNamespace,
                name: toBackstageCompliantName(`${schemaName}.${table.name}`),
              })),
              ...schema.views.map(view => ({
                kind: 'View',
                namespace: defaultNamespace,
                name: toBackstageCompliantName(`${schemaName}.${view.name}`),
              })),
            ],
          },
        } as PostgreSQLSchemaEntity,
        ...schema.tables.map(
          (table): PostgreSQLTableEntity => ({
            apiVersion: 'geoportia.se/v1alpha1',
            kind: 'Table',
            metadata: {
              name: toBackstageCompliantName(`${schemaName}.${table.name}`),
              namespace: defaultNamespace,
              title: `${schemaName}.${table.name}`,
              // ToDo: At some point we're going to have to remove these two...
              evenName: table.name.length % 2 === 0 ? 'true' : 'false',
              longName: table.name.length > 5 ? 'true' : 'false',
              description: table.comment || undefined,
              annotations: {
                [ANNOTATION_LOCATION]: this.uri,
                [ANNOTATION_ORIGIN_LOCATION]: this.uri,
              },
            },
            spec: {
              dialect: 'postgresql',
              dependencyOf: [],
            },
          }),
        ),
        ...schema.views.map(
          (view): PostgreSQLViewEntity => ({
            apiVersion: 'geoportia.se/v1alpha1',
            kind: 'View',
            metadata: {
              name: toBackstageCompliantName(`${schemaName}.${view.name}`),
              namespace: defaultNamespace,
              title: `${schemaName}.${view.name}`,
              description: view.comment || undefined,
              annotations: {
                [ANNOTATION_LOCATION]: this.uri,
                [ANNOTATION_ORIGIN_LOCATION]: this.uri,
              },
            },
            spec: {
              dialect: 'postgresql',
              dependencyOf: view.columns
                .filter((column: ViewColumn) => {
                  // Filter out every table dependency that has already been added to the map, to avoid duplicate dependencies.
                  // This is needed because some views can have multiple columns depending on the same table, and we only want to add one dependency per table.
                  if (
                    column.source &&
                    column.source.schema &&
                    column.source.table &&
                    viewTableMap.get(
                      toBackstageCompliantName(`${schemaName}.${view.name}`),
                    ) === undefined
                  ) {
                    viewTableMap.set(
                      toBackstageCompliantName(`${schemaName}.${view.name}`),
                      toBackstageCompliantName(
                        `${column.source.schema}.${column.source.table}`,
                      ),
                    );
                    return true;
                  }
                  return false;
                })
                .map((column: ViewColumn) => ({
                  kind: 'Table',
                  namespace: defaultNamespace,
                  name: toBackstageCompliantName(
                    // @ts-ignore
                    `${column.source.schema}.${column.source.table}`,
                  ),
                })),
            },
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
