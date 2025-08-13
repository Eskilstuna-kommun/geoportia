import { Entity, KindValidator } from '@backstage/catalog-model';
import { JsonObject } from '@backstage/types';

export interface TableSpec {
  schema: string;
  table: string;
}

export interface FMEWorkspaceEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'FMEWorkspace';
  spec: {
    type: string;
    lifecycle?: string;
    owner?: string;
    lastUpdated?: string;
    tables?: TableSpec[];
  } & JsonObject;
}

export const isFMEWorkspaceEntity = (
  entity: Entity,
): entity is FMEWorkspaceEntity =>
  entity.apiVersion === 'geoportia.se/v1alpha1' &&
  entity.kind === 'FMEWorkspace' &&
  typeof entity.spec === 'object' &&
  typeof entity.spec.type === 'string';

export const fmeWorkspaceEntityValidator: KindValidator = {
  async check(entity) {
    return isFMEWorkspaceEntity(entity);
  },
};
