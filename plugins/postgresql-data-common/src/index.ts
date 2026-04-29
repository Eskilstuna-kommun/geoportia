import { CompoundEntityRef, Entity, KindValidator } from '@backstage/catalog-model';
import { JsonObject } from '@backstage/types';

export interface PostgreSQLTableEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'Table';
  spec: {
    dialect: 'postgresql';
    dependencyOf: CompoundEntityRef[];
  } & JsonObject;
}
export interface PostgreSQLViewEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'View';
  spec: {
    dialect: 'postgresql';
    dependencyOf: CompoundEntityRef[];
  } & JsonObject;
}
export interface PostgreSQLSchemaEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'Schema';
  spec: {
    dialect: 'postgresql';
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
  data.apiVersion === 'geoportia.se/v1alpha1' && data.kind === 'Table' && data.spec?.dialect === 'postgresql';

export const isPostgreSQLViewEntity = (
  data: Entity,
): data is PostgreSQLViewEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' && data.kind === 'View' && data.spec?.dialect === 'postgresql';

export const isPostgreSQLSchemaEntity = (
  data: Entity,
): data is PostgreSQLSchemaEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' && data.kind === 'Schema' && data.spec?.dialect === 'postgresql';