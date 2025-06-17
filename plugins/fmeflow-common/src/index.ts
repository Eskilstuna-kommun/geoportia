import { Entity, KindValidator } from '@backstage/catalog-model';
import { JsonObject } from '@backstage/types';

/**
 * FMEWorkspace Entity Definition
 */
export interface FMEWorkspaceEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'FMEWorkspace';
  spec: {
    type: string;
    lifecycle: string;
    owner: string;
    lastUpdated?: string;
  } & JsonObject;
}

/**
 * Type guard to check if an Entity is an FMEWorkspaceEntity
 */
export const isFMEWorkspaceEntity = (entity: Entity): entity is FMEWorkspaceEntity =>
  entity.apiVersion === 'geoportia.se/v1alpha1' &&
  entity.kind === 'FMEWorkspace' &&
  typeof entity.spec === 'object' &&
  typeof entity.spec.owner === 'string' &&
  typeof entity.spec.type === 'string' &&
  typeof entity.spec.lastUpdated === 'string' &&
  typeof entity.spec.lifecycle === 'string';

/**
 * Validator to be registered with the catalog for FMEWorkspace entities
 */
export const fmeWorkspaceEntityValidator: KindValidator = {
  async check(entity: Entity): Promise<boolean> {
    return isFMEWorkspaceEntity(entity);
  },
};
