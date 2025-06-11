import { Entity, KindValidator } from '@backstage/catalog-model';
import { JsonObject } from '@backstage/types';

/**
 * FmeWorkspace Entity Definition
 */
export interface FmeWorkspaceEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'FmeWorkspace';
  spec: {
    type: string;
    lifecycle: string;
    owner: string;
  } & JsonObject;
}

/**
 * Type guard to check if an Entity is an FmeWorkspaceEntity
 */
export const isFmeWorkspaceEntity = (entity: Entity): entity is FmeWorkspaceEntity =>
  entity.apiVersion === 'geoportia.se/v1alpha1' &&
  entity.kind === 'FmeWorkspace' &&
  typeof entity.spec === 'object' &&
  typeof entity.spec.owner === 'string' &&
  typeof entity.spec.type === 'string' &&
  typeof entity.spec.lifecycle === 'string';

/**
 * Validator to be registered with the catalog for FmeWorkspace entities
 */
export const fmeWorkspaceEntityValidator: KindValidator = {
  async check(entity: Entity): Promise<boolean> {
    return isFmeWorkspaceEntity(entity);
  },
};
