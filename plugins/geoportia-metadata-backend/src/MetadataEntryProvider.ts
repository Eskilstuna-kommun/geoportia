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
  parseEntityRef,
} from '@backstage/catalog-model';
import { JsonObject } from '@backstage/types';

const PROVIDER_NAME = 'geoportia-metadata-entry-provider';

interface MetadataEntryApiResponse {
  entityRef: string;
  schema: JsonObject;
  metadata: JsonObject;
}

export class MetadataEntryProvider implements EntityProvider {
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
      throw new Error('MetadataEntryProvider not initialized');
    }

    this.logger.info('MetadataEntryProvider: fetching metadata entries from API');

    let entries: MetadataEntryApiResponse[] = [];
    try {
      const baseUrl = await this.discovery.getBaseUrl('geoportia-metadata');
      const response = await fetch(`${baseUrl}/metadata-entries`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata entries: ${response.status}`);
      }
      
      entries = await response.json();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `MetadataEntryProvider: failed to fetch metadata entries: ${errorMessage}`,
      );
      return;
    }

    const entities: Entity[] = entries.map(entry => this.entryToEntity(entry));

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

  private entryToEntity(entry: MetadataEntryApiResponse): Entity {
    const ref = parseEntityRef(entry.entityRef);
    const metadataObj = entry.metadata ?? {};
    const schemaObj = entry.schema ?? {};

    // Extract title and description from metadata if present
    const title =
      typeof metadataObj?.title === 'string' ? metadataObj.title : undefined;
    const description =
      typeof metadataObj?.description === 'string'
        ? metadataObj.description
        : undefined;

    // Determine the apiVersion of the described entity (e.g., table.geoportia.se/v1alpha1)
    const describedEntityApiVersion = `${ref.kind.toLowerCase()}.geoportia.se/v1alpha1`;

    // Use the original name from the entityRef since it's already Backstage-compliant
    const entity: Entity = {
      apiVersion: 'geoportia.se/v1alpha1',
      kind: 'MetadataEntry',
      metadata: {
        name: ref.name,
        namespace: ref.namespace ?? 'default',
        title,
        description,
        annotations: {
          [ANNOTATION_LOCATION]: `geoportia-metadata:${entry.entityRef}`,
          [ANNOTATION_ORIGIN_LOCATION]: `geoportia-metadata:${entry.entityRef}`,
          'geoportia.se/described-entity-ref': entry.entityRef,
        },
      },
      spec: {
        describedEntityRef: entry.entityRef,
        describedEntityKind: describedEntityApiVersion,
        schema: schemaObj,
        metadata: metadataObj,
      },
      // Relations are emitted by MetadataEntryProcessor for bidirectional linking
    };

    return entity;
  }
}
