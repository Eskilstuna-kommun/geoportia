import { Entity } from '@backstage/catalog-model';

export interface TableEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'Table';
}

export const isTableEntity = (data: Entity): data is TableEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' && data.kind === 'Table';
