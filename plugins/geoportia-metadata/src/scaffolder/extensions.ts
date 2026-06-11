import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { GeoPortiaMetadataField } from './GeoPortiaMetadataField';
import type {
  GeoPortiaMetadataFieldValue,
  GeoPortiaMetadataFieldUiOptions,
} from './GeoPortiaMetadataField';
import { GeoserverCommonInformationField } from './GeoserverCommonInformationField';

export const GeoPortiaMetadataFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'GeoPortiaMetadataField',
    component: GeoPortiaMetadataField as any,
  }),
);

export const GeoserverCommonInformationFieldExtensions =
  scaffolderPlugin.provide(
    createScaffolderFieldExtension({
      name: 'GeoserverCommonInformationField',
      component: GeoserverCommonInformationField as any,
    }),
  );

export type { GeoPortiaMetadataFieldValue, GeoPortiaMetadataFieldUiOptions };
