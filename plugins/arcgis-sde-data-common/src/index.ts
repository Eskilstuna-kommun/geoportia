import { Entity, KindValidator } from '@backstage/catalog-model';
import { JsonObject } from '@backstage/types';

export interface ArcGISFeatureClassField {
  aliasName: string;
  domain: string;
  fieldPrecision: number;
  fieldScale: number;
  isNullable: boolean;
  length: number;
  name: string;
  type: string;
}

export interface ArcGISFeatureClassFields {
  fields: ArcGISFeatureClassField[];
}

export interface ArcGISDomain {
  domainType: string;
  fieldType: string;
  name: string;
}

export interface ArcGISDomainValue {
  code: number;
  description: string;
}

export interface ArcGISDomainValues {
  values: ArcGISDomainValue[];
}

export interface ArcGISSDEDomainEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'ArcGISDomain';
  spec: JsonObject & ArcGISDomainValues;
}

export interface ArcGISSDEDomainValueEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'ArcGISDomainValue';
  spec: JsonObject & ArcGISDomainValue;
}

export interface ArcGISSDEFeatureClassEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'ArcGISFeatureClass';
  spec: JsonObject & ArcGISFeatureClassFields;
}

export interface ArcGISSDEFeatureClassFieldEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'ArcGISFeatureClassField';
  spec: JsonObject & ArcGISFeatureClassField;
}

export const arcGISSDEDomainEntityValidator: KindValidator = {
  async check(_data: Entity) {
    return true;
  },
};

export const arcGISSDEDomainValueEntityValidator: KindValidator = {
  async check(_data: Entity) {
    return true;
  },
};

export const arcGISSDEFeatureClassEntityValidator: KindValidator = {
  async check(_data: Entity) {
    return true;
  },
};

export const arcGISSDEFeatureClassFieldEntityValidator: KindValidator = {
  async check(_data: Entity) {
    return true;
  },
};

export const isArcGISSDEDomainEntity = (
  data: Entity,
): data is ArcGISSDEDomainEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' &&
  data.kind === 'ArcGISSDEDomainEntity';

export const isArcGISSDEDomainValueEntity = (
  data: Entity,
): data is ArcGISSDEDomainValueEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' &&
  data.kind === 'ArcGISSDEDomainValueEntity';

export const isArcGISSDEFeatureClassEntity = (
  data: Entity,
): data is ArcGISSDEFeatureClassEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' &&
  data.kind === 'ArcGISSDEFeatureClassEntity';

export const isArcGISSDEFeatureClassFieldEntity = (
  data: Entity,
): data is ArcGISSDEFeatureClassFieldEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' &&
  data.kind === 'ArcGISSDEFeatureClassFieldEntity';
