import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import {
  LoggerService,
  SchedulerServiceTaskRunner,
} from '@backstage/backend-plugin-api';
import { Entity } from '@backstage/catalog-model';
import { Knex } from 'knex';

const PROVIDER_NAME = 'geoportia-data-owner-provider';

interface DataOwnerEntityRow {
  entity: Entity | string;
}

/** Publishes GeoPortia-managed records as standard Backstage Group entities. */
export class DataOwnerEntityProvider implements EntityProvider {
  private connection?: EntityProviderConnection;

  constructor(
    private readonly database: Knex,
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
      fn: () => this.run(),
    });
    await this.run();
  }

  async run() {
    if (!this.connection) {
      throw new Error('DataOwnerEntityProvider not initialized');
    }

    const rows = await this.database<DataOwnerEntityRow>(
      'geoportia_data_owner_entities',
    ).select('entity');
    const entities = rows.map(row =>
      typeof row.entity === 'string' ? JSON.parse(row.entity) as Entity : row.entity,
    );

    await this.connection.applyMutation({
      type: 'full',
      entities: entities.map(entity => ({
        entity,
        locationKey: this.getProviderName(),
      })),
    });
    this.logger.info(`DataOwnerEntityProvider: providing ${entities.length} Group entities`);
  }
}
