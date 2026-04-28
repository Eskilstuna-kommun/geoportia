import { CompoundEntityRef, Entity, KindValidator } from '@backstage/catalog-model';
import { JsonObject } from '@backstage/types';

export interface PostgreSQLTableEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'Table';
  spec: {
    dependencyOf: CompoundEntityRef[];
  } & JsonObject;
}
export interface PostgreSQLViewEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'View';
  spec: {
    dependencyOf: CompoundEntityRef[];
  } & JsonObject;
}
export interface PostgreSQLSchemaEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'Schema';
  spec: {
    dependencyOf: CompoundEntityRef[];
  } & JsonObject;
}

export const postgresqlTableEntityValidator: KindValidator = {
  async check(_data: Entity) {
    return true;
  },
};
export const postgresqlViewEntityValidator: KindValidator = {
  async check(_data: Entity) {
    return true;
  },
};
export const postgresqlSchemaEntityValidator: KindValidator = {
  async check(_data: Entity) {
    return true;
  },
};
export const isPostgreSQLTableEntity = (
  data: Entity,
): data is PostgreSQLTableEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' && data.kind === 'Table';

export const isPostgreSQLViewEntity = (
  data: Entity,
): data is PostgreSQLViewEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' && data.kind === 'View';

export const isPostgreSQLSchemaEntity = (
  data: Entity,
): data is PostgreSQLSchemaEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' && data.kind === 'Schema';