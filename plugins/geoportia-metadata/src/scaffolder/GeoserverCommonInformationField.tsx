import React, { useRef, useEffect, useState } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { useAsync } from 'react-use';
import { JsonObject } from '@backstage/types';

import type {
  GeoserverCommonInformationFieldUiOptions,
  GeoserverCommonInformationFieldValue,
} from './types';

export const GeoserverCommonInformationField = (
  props: FieldExtensionComponentProps<GeoserverCommonInformationFieldValue>,
) => {
  const { onChange, uiSchema, formContext } = props;
  const catalogApi = useApi(catalogApiRef);

  const uiOptions = uiSchema?.['ui:options'] as
    | GeoserverCommonInformationFieldUiOptions
    | undefined;
  const rawMetadataSchema = uiOptions?.geoserverMetadataSchema;
  const prefillFromEntity = uiOptions?.prefillFromEntity;

  // Get entity ref from formContext (sibling field in same form step)
  const entityRefFromContext = formContext?.formData?.entityRef as
    | string
    | undefined;
  const effectiveEntityRef = prefillFromEntity || entityRefFromContext;

  const { value: prefillData } = useAsync(async () => {
    if (!effectiveEntityRef) {
      return null;
    }
    try {
      const entity = await catalogApi.getEntityByRef(effectiveEntityRef);
      if (!entity) {
        return null;
      }
      // MetadataEntry entities store schema and metadata in spec
      return {
        schema: (entity.spec as { schema?: JsonObject })?.schema ?? {},
        metadata: (entity.spec as { metadata?: JsonObject })?.metadata ?? {},
      };
    } catch {
      return null;
    }
  }, [effectiveEntityRef, catalogApi]);

  const [title, setTitle] = useState<string>('');

  useEffect(() => {
    if (
      prefillData?.metadata &&
      rawMetadataSchema
    ) {
      onChange({
        schema: { type: 'object', ...rawMetadataSchema },
        metadata: {
          ...prefillData.metadata,
          layerInfo: {
            // @ts-ignore
            ...prefillData.metadata.layerInfo,
            title: title,
          },
        },
      });
    }
  }, [title]);

  useEffect(() => {
    if (prefillData) {
      // @ts-ignore
      setTitle(prefillData.metadata?.layerInfo?.title ?? '');
    }
  }, [prefillData]);

  return (
    <div>
      <input
        type="text"
        placeholder="Enter layer title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ marginBottom: '1rem', width: '100%' }}
      />
    </div>
  );
};
