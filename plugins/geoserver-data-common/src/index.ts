import { Entity, KindValidator } from '@backstage/catalog-model';
import { JsonObject } from '@backstage/types';

export interface GeoserverStoreEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'GeoserverStore';
  spec: JsonObject;
}
export interface GeoserverLayerEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'GeoserverLayer';
  spec: JsonObject;
}

export const geoserverStoreEntityValidator: KindValidator = {
  async check(_data: Entity) {
    return true;
  },
};
export const geoserverLayerEntityValidator: KindValidator = {
  async check(_data: Entity) {
    return true;
  },
};

export const isGeoserverStoreEntity = (
  data: Entity,
): data is GeoserverStoreEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' && data.kind === 'GeoserverStore';

export const isGeoserverLayerEntity = (
  data: Entity,
): data is GeoserverLayerEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' && data.kind === 'GeoserverLayer';
