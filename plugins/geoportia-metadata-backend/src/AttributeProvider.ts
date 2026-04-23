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
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { JsonObject } from '@backstage/types';
import { convertNameToBackstageCompliant as toBackstageCompliantName } from '@internal/backstage-plugin-entity-name-common';

const PROVIDER_NAME = 'geoportia-attribute-provider';

interface MetadataEntryApiResponse {
  entityRef: string;
  schema: JsonObject;
  metadata: JsonObject;
}

interface AttributeData {
  name: string;
  alias?: string;
  description?: string;
  dataFormat?: string;
  length?: string;
  securityClass?: string;
  domain?: string;
  allowEmptyValues?: boolean;
}

export class AttributeProvider implements EntityProvider {
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
      throw new Error('AttributeProvider not initialized');
    }

    this.logger.info('AttributeProvider: fetching metadata entries from API');

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
        `AttributeProvider: failed to fetch metadata entries: ${errorMessage}`,
      );
      return;
    }

    // Extract all attributes from all metadata entries
    const entities: Entity[] = [];
    for (const entry of entries) {
      const attributeEntities = this.extractAttributeEntities(entry);
      entities.push(...attributeEntities);
    }

    this.logger.info(
      `AttributeProvider: providing ${entities.length} Attribute entities`,
    );

    await this.connection.applyMutation({
      type: 'full',
      entities: entities.map(entity => ({
        entity,
        locationKey: this.getProviderName(),
      })),
    });
  }

  private extractAttributeEntities(entry: MetadataEntryApiResponse): Entity[] {
    const metadataObj = entry.metadata ?? {};
    
    // Define the expected structure of metadata with attributes
    interface MetadataWithAttributes {
      attributes?: AttributeData[] | { metadata?: AttributeData[] };
    }
    const typedMetadata = metadataObj as MetadataWithAttributes;
    
    // Attributes can be in metadata.attributes or in attributes.metadata (depending on schema structure)
    let attributes: AttributeData[] = [];
    
    // Check common locations for attributes array
    if (Array.isArray(typedMetadata.attributes)) {
      attributes = typedMetadata.attributes;
    } else if (typedMetadata.attributes && 'metadata' in typedMetadata.attributes && Array.isArray(typedMetadata.attributes.metadata)) {
      attributes = typedMetadata.attributes.metadata;
    }

    if (attributes.length === 0) {
      return [];
    }

    const parentRef = parseEntityRef(entry.entityRef);
    // Use the original name since MetadataEntry entities now use original names without hashes
    const parentEntityRef = stringifyEntityRef({
      kind: 'MetadataEntry',
      namespace: parentRef.namespace ?? 'default',
      name: parentRef.name,
    });

    return attributes.map((attr, index) => this.attributeToEntity(attr, entry.entityRef, parentEntityRef, index));
  }

  private attributeToEntity(
    attr: AttributeData,
    originalParentRef: string,
    parentEntityRef: string,
    index: number,
  ): Entity {
    const parentRef = parseEntityRef(originalParentRef);
    // Keep using toBackstageCompliantName for attribute names since they may have special characters
    const attrName = attr.name ? toBackstageCompliantName(attr.name) : `attr-${index}`;
    const uniqueName = `${parentRef.name}-${attrName}`;

    const entity: Entity = {
      apiVersion: 'geoportia.se/v1alpha1',
      kind: 'Attribute',
      metadata: {
        name: uniqueName,
        namespace: parentRef.namespace ?? 'default',
        title: attr.alias || attr.name,
        description: attr.description,
        annotations: {
          [ANNOTATION_LOCATION]: `geoportia-attribute:${originalParentRef}:${attr.name}`,
          [ANNOTATION_ORIGIN_LOCATION]: `geoportia-attribute:${originalParentRef}:${attr.name}`,
          'geoportia.se/parent-metadata-entry': parentEntityRef,
          'geoportia.se/attribute-name': attr.name || '',
        },
      },
      spec: {
        name: attr.name,
        alias: attr.alias,
        description: attr.description,
        dataFormat: attr.dataFormat,
        length: attr.length,
        securityClass: attr.securityClass,
        domain: attr.domain,
        allowEmptyValues: attr.allowEmptyValues ?? false,
        parentMetadataEntry: parentEntityRef,
      },
      relations: [
        {
          type: 'childOf',
          targetRef: parentEntityRef,
        },
      ],
    };

    return entity;
  }
}
