import { Entity, KindValidator } from '@backstage/catalog-model';
import { JsonValue } from '@backstage/types';

export interface DatasetSpec {
  [key: string]: JsonValue | undefined;
  summary?: string;
  versioning?: string;
  allowZValues?: boolean;
  status?: string;
}

export interface DatasetEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'Dataset';
  spec: DatasetSpec;
}

export const datasetEntityValidator: KindValidator = {
  async check(_data: Entity) {
    return true;
  },
};

export const isDatasetEntity = (data: Entity): data is DatasetEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' && data.kind === 'Dataset';
