import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import {
  LoggerService,
  SchedulerServiceTaskRunner,
} from '@backstage/backend-plugin-api';
import {
  ANNOTATION_LOCATION,
  ANNOTATION_ORIGIN_LOCATION,
  Entity,
  parseEntityRef,
} from '@backstage/catalog-model';
import { JsonObject } from '@backstage/types';
import { Knex } from 'knex';
import { TableRow } from './database';
import { convertNameToBackstageCompliant as toBackstageCompliantName } from '@internal/backstage-plugin-entity-name-common';
import {
  RELATION_DESCRIBES,
} from '@internal/geoportia-metadata-common';

const PROVIDER_NAME = 'geoportia-metadata-entry-provider';

export class MetadataEntryProvider implements EntityProvider {
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
      fn: async () => {
        await this.run();
      },
    });
    await this.run();
  }

  async run() {
    if (!this.connection) {
      throw new Error('MetadataEntryProvider not initialized');
    }

    this.logger.info('MetadataEntryProvider: fetching metadata entries');

    const rows = await this.database<TableRow>('geoportia_metadata').select(
      '*',
    );

    const entities: Entity[] = rows.map(row => this.rowToEntity(row));

    this.logger.info(
      `MetadataEntryProvider: providing ${entities.length} MetadataEntry entities`,
    );

    await this.connection.applyMutation({
      type: 'full',
      entities: entities.map(entity => ({
        entity,
        locationKey: this.getProviderName(),
      })),
    });
  }

  async refresh(entityRef: string, deleted: boolean = false) {
    if (!this.connection) {
      this.logger.warn(
        'MetadataEntryProvider: refresh called but provider not connected',
      );
      return;
    }

    if (deleted) {
      // For deletions we need to provide the entity that was removed
      const ref = parseEntityRef(entityRef);
      const removedEntity: Entity = {
        apiVersion: 'geoportia.se/v1alpha1',
        kind: 'MetadataEntry',
        metadata: {
          name: toBackstageCompliantName(ref.name),
          namespace: ref.namespace ?? 'default',
          annotations: {
            [ANNOTATION_LOCATION]: `geoportia-metadata:${entityRef}`,
            [ANNOTATION_ORIGIN_LOCATION]: `geoportia-metadata:${entityRef}`,
          },
        },
        spec: {},
      };

      await this.connection.applyMutation({
        type: 'delta',
        added: [],
        removed: [
          {
            entity: removedEntity,
            locationKey: this.getProviderName(),
          },
        ],
      });
      return;
    }

    // For creates/updates, fetch the row and convert to entity
    const row = await this.database<TableRow>('geoportia_metadata')
      .where({ entity_ref: entityRef })
      .first();

    if (!row) {
      this.logger.warn(
        `MetadataEntryProvider: refresh called for ${entityRef} but row not found`,
      );
      return;
    }

    const entity = this.rowToEntity(row);

    // Apply a delta mutation to update the entity in the catalog
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
  }

  // converts a database row into a Backstage catalog
  private rowToEntity(row: TableRow): Entity {
    const ref = parseEntityRef(row.entity_ref);
    const metadataObj = (row.metadata ?? {}) as JsonObject;
    const schemaObj = (row.schema ?? {}) as JsonObject;

    // Extract title and description from metadata if present
    const title =
      typeof metadataObj?.title === 'string' ? metadataObj.title : undefined;
    const description =
      typeof metadataObj?.description === 'string'
        ? metadataObj.description
        : undefined;

    // Build the target entity reference for relations
    const targetRef = {
      kind: ref.kind,
      namespace: ref.namespace ?? 'default',
      name: ref.name,
    };

    // Determine the apiVersion of the described entity (e.g., table.geoportia.se/v1alpha1)
    const describedEntityApiVersion = `${ref.kind.toLowerCase()}.geoportia.se/v1alpha1`;

    const entity: Entity = {
      apiVersion: 'geoportia.se/v1alpha1',
      kind: 'MetadataEntry',
      metadata: {
        name: toBackstageCompliantName(ref.name),
        namespace: ref.namespace ?? 'default',
        title,
        description,
        annotations: {
          [ANNOTATION_LOCATION]: `geoportia-metadata:${row.entity_ref}`,
          [ANNOTATION_ORIGIN_LOCATION]: `geoportia-metadata:${row.entity_ref}`,
          'geoportia.se/described-entity-ref': row.entity_ref,
        },
      },
      spec: {
        describedEntityRef: row.entity_ref,
        describedEntityKind: describedEntityApiVersion,
        schema: schemaObj,
        metadata: metadataObj,
      },
      relations: [
        {
          type: RELATION_DESCRIBES,
          targetRef: `${targetRef.kind}:${targetRef.namespace}/${targetRef.name}`,
        },
      ],
    };

    return entity;
  }
}
