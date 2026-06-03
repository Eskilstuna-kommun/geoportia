import { CompoundEntityRef, Entity, KindValidator } from '@backstage/catalog-model';
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

export interface Field {
  aliasName: string;
  domain: string;
  fieldPrecision: number;
  fieldScale: number;
  isNullable: boolean;
  length: number;
  name: string;
  type: string;
}

export interface DomainValue {
  code: number;
  description: string;
}

export interface ArcGISSDEDomainEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'GPDomain';
  spec: {
    dialect: 'arcgis';
    dependencyOf: CompoundEntityRef[];
  } & JsonObject;
}

export interface ArcGISSDEDomainValueEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'Value';
  spec: {
    dialect: 'arcgis';
    dependencyOf: CompoundEntityRef[];
  } & JsonObject;
}

export interface ArcGISSDEDataSetEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'Schema';
  spec: {
    dialect: 'arcgis';
    dependencyOf: CompoundEntityRef[];
  } & JsonObject;
}

export interface ArcGISSDEFeatureClassEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'Table';
  spec: {
    dialect: 'arcgis';
    dependencyOf: CompoundEntityRef[];
  } & JsonObject;
}

export interface ArcGISSDEFeatureClassFieldEntity extends Entity {
  apiVersion: 'geoportia.se/v1alpha1';
  kind: 'Field';
  spec: {
    dialect: 'arcgis';
    dependencyOf: CompoundEntityRef[];
  } & JsonObject;
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

export const arcGISSDEDataSetEntityValidator: KindValidator = {
  async check(_data: Entity) {
    return true;
  },
};

export const isArcGISSDEDomainEntity = (data: Entity): data is ArcGISSDEDomainEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' &&
  data.kind === 'GPDomain' &&
  data.spec?.dialect === 'arcgis';

export const isArcGISSDEDomainValueEntity = (
  data: Entity,
): data is ArcGISSDEDomainValueEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' &&
  data.kind === 'Value' &&
  data.spec?.dialect === 'arcgis';

export const isArcGISSDEFeatureClassEntity = (
  data: Entity,
): data is ArcGISSDEFeatureClassEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' &&
  data.kind === 'Table' &&
  data.spec?.dialect === 'arcgis';

export const isArcGISSDEFeatureClassFieldEntity = (
  data: Entity,
): data is ArcGISSDEFeatureClassFieldEntity =>
  data.apiVersion === 'geoportia.se/v1alpha1' &&
  data.kind === 'Field' &&
  data.spec?.dialect === 'arcgis';

  export const isArcGISSDEDataSetEntity = (
    data: Entity,
  ): data is ArcGISSDEDataSetEntity =>
    data.apiVersion === 'geoportia.se/v1alpha1' &&
    data.kind === 'Schema' &&
    data.spec?.dialect === 'arcgis';

