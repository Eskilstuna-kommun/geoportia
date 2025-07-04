// packages/fmeflow-common/src/index.ts

import { Entity, KindValidator } from '@backstage/catalog-model';
import { JsonObject } from '@backstage/types';

interface FMELogEntry  {
  line: string;
  message: string;
}

export interface FMEWorkspaceEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'FMEWorkspace';
  spec: {
    type: string;
    lifecycle?: string;
    owner?: string;
    lastUpdated?: string;
  } & JsonObject;
}

export const isFMEWorkspaceEntity = (entity: Entity): entity is FMEWorkspaceEntity =>
  entity.apiVersion === 'geoportia.se/v1alpha1' &&
  entity.kind === 'FMEWorkspace' &&
  typeof entity.spec === 'object' &&
  typeof entity.spec.type === 'string'


export const isResourceEntity = (entity: Entity): boolean =>
    entity.apiVersion === 'geoportia.se/v1alpha1' &&
    entity.kind === 'Resource' &&
    typeof entity.metadata?.name === 'string';
  
export const isTableEntity = (entity: Entity): boolean =>
    entity.apiVersion === 'geoportia.se/v1alpha1' &&
    entity.kind === 'Table' &&
    typeof entity.metadata?.name === 'string';
  

    export const fmeWorkspaceEntityValidator: KindValidator = {
      async check(entity: Entity): Promise<boolean> {
        return (
          isFMEWorkspaceEntity(entity) ||
          isResourceEntity(entity) ||
          isTableEntity(entity)
        );
      },
    };

export interface DatabaseRelation {
  database?: string;
  dataset?: string;
  tables: { schema: string; table: string }[];
}

export function extractDatabaseRelationsFromLogEntries(entries: FMELogEntry[]): DatabaseRelation {
  const result: DatabaseRelation = {
    database: undefined,
    dataset: undefined,
    tables: [],
  };

  const seenTables = new Set<string>();

  for (const entry of entries) {
    const line = entry.message;

    // Match any line mentioning FeatureReader and POSTGIS and dataset
    if (/FeatureReader.*dataset/i.test(line)) {
      const match = line.match(/dataset\s+['`]?(.*?)['`]?(?:'|$)/i);
      if (match) {
        result.database = match[1].trim();
      }
    }

    // Match lines with POSTGIS and 'dataset' keyword
    if (/POSTGIS.*dataset/i.test(line)) {
      const match = line.match(/dataset\s+['`]?(.*?)['`]?(?:'|$)/i);
      if (match) {
        result.dataset = match[1].trim();
      }
    }

    // Match any line reading a table (loosely)
    if (/reading.*table/i.test(line)) {
      const match = line.match(/'(.+?)\.(.+?)'/);
      if (match) {
        const key = `${match[1]}.${match[2]}`;
        if (!seenTables.has(key)) {
          seenTables.add(key);
          result.tables.push({ schema: match[1], table: match[2] });
        }
      }
    }

    // Match SQLExecutor and FeatureReader "select * from ..."
    if (/Executing.*query/i.test(line)) {
      const matches = [...line.matchAll(/"(\w+)"\."(\w+)"/g)];
      for (const m of matches) {
        const key = `${m[1]}.${m[2]}`;
        if (!seenTables.has(key)) {
          seenTables.add(key);
          result.tables.push({ schema: m[1], table: m[2] });
        }
      }
    }
  }

  return result;
}





