import React, { useCallback, useMemo, useRef } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import Form from '@rjsf/material-ui';
import validator from '@rjsf/validator-ajv8';
import type { RJSFSchema, UiSchema as RJSFUiSchema, ArrayFieldTemplateProps } from '@rjsf/utils';
import { Typography, Box } from '@material-ui/core';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';

import { customWidgets } from './widgets';
import { createCustomTemplates } from './templates';
import { TableArrayFieldTemplate } from './TableArrayFieldTemplate';
import type { GeoPortiaMetadataFieldValue, GeoPortiaMetadataFieldUiOptions } from './types';

export type { GeoPortiaMetadataFieldValue, GeoPortiaMetadataFieldUiOptions };

/**
 * Smart ArrayFieldTemplate that uses TableArrayFieldTemplate for arrays with object items
 * The table view is the default for our metadata forms
 */
const SmartArrayFieldTemplate = (props: ArrayFieldTemplateProps) => {
  // Use table template for arrays with object items
  if (props.schema?.items && typeof props.schema.items === 'object' && !Array.isArray(props.schema.items)) {
    return <TableArrayFieldTemplate {...props} />;
  }
  
  // For other array types, return null to fall back to default
  return null;
};

export const GeoPortiaMetadataField = (
  props: FieldExtensionComponentProps<GeoPortiaMetadataFieldValue>,
) => {
  const { onChange, formData, uiSchema } = props;

  // Extract options from uiSchema
  const uiOptions = uiSchema?.['ui:options'] as GeoPortiaMetadataFieldUiOptions | undefined;
  const rawMetadataSchema = uiOptions?.geoportiaMetadataSchema;
  const metadataUiSchema = uiOptions?.geoportiaMetadataUiSchema;
  const headerTitle = uiOptions?.headerTitle;
  const headerDescription = uiOptions?.headerDescription;

  // Check if schema is an array type at root level
  const isArraySchema = rawMetadataSchema?.type === 'array';

  // Ensure schema has proper structure - preserve array type if specified
  const metadataSchema = useMemo((): RJSFSchema | undefined => {
    if (!rawMetadataSchema) return undefined;
    if (isArraySchema) {
      return rawMetadataSchema;
    }
    return { type: 'object', ...rawMetadataSchema };
  }, [rawMetadataSchema, isArraySchema]);

  // Merge uiSchema with fullWidth defaults
  const mergedUiSchema = useMemo((): RJSFUiSchema => {
    const defaultUi: RJSFUiSchema = {};
    const schemaProps = rawMetadataSchema?.properties as Record<string, any> | undefined;
    if (schemaProps) {
      Object.keys(schemaProps).forEach((key) => {
        const propType = schemaProps[key]?.type;
        if (propType === 'string' && !schemaProps[key]?.enum) {
          defaultUi[key] = { 'ui:options': { fullWidth: true }, ...(metadataUiSchema?.[key] || {}) };
        } else {
          defaultUi[key] = metadataUiSchema?.[key] || {};
        }
      });
    }
    return { ...defaultUi, ...metadataUiSchema };
  }, [rawMetadataSchema, metadataUiSchema]);

  // Templates for the form - include ArrayFieldTemplate
  const templates = useMemo(() => ({
    ...createCustomTemplates('Lägg till'),
    ArrayFieldTemplate: SmartArrayFieldTemplate,
  }), []);

  // Ref to store current metadata for use in callbacks
  const currentMetadataRef = useRef<unknown[] | Record<string, unknown>>(formData?.metadata ?? (isArraySchema ? [] : {}));
  currentMetadataRef.current = formData?.metadata ?? (isArraySchema ? [] : {});

  // Handle form data changes
  const handleChange = useCallback(
    (data: { formData?: Record<string, unknown> | unknown[] }) => {
      if (!rawMetadataSchema) return;
      onChange({ schema: rawMetadataSchema, metadata: data.formData ?? (isArraySchema ? [] : {}) });
    },
    [rawMetadataSchema, onChange, isArraySchema],
  );

  // Callback to add item directly to root array - used by TableArrayFieldTemplate 
  const addArrayItem = useCallback((item: unknown) => {
    if (!rawMetadataSchema || !isArraySchema) return;
    const currentArray = Array.isArray(currentMetadataRef.current) ? currentMetadataRef.current : [];
    const newArray = [...currentArray, item];
    onChange({ schema: rawMetadataSchema, metadata: newArray });
  }, [rawMetadataSchema, isArraySchema, onChange]);

  // Callback to update an existing item in root array
  const updateArrayItem = useCallback((index: number, item: unknown) => {
    if (!rawMetadataSchema || !isArraySchema) return;
    const currentArray = Array.isArray(currentMetadataRef.current) ? currentMetadataRef.current : [];
    const newArray = [...currentArray];
    if (index >= 0 && index < newArray.length) {
      newArray[index] = item;
      onChange({ schema: rawMetadataSchema, metadata: newArray });
    }
  }, [rawMetadataSchema, isArraySchema, onChange]);

  // Callback to delete an item from root array
  const deleteArrayItem = useCallback((index: number) => {
    if (!rawMetadataSchema || !isArraySchema) return;
    const currentArray = Array.isArray(currentMetadataRef.current) ? currentMetadataRef.current : [];
    const newArray = currentArray.filter((_, i) => i !== index);
    onChange({ schema: rawMetadataSchema, metadata: newArray });
  }, [rawMetadataSchema, isArraySchema, onChange]);

  // Form context to pass callbacks to nested components
  const formContext = useMemo(() => ({
    addArrayItem: isArraySchema ? addArrayItem : undefined,
    updateArrayItem: isArraySchema ? updateArrayItem : undefined,
    deleteArrayItem: isArraySchema ? deleteArrayItem : undefined,
  }), [isArraySchema, addArrayItem, updateArrayItem, deleteArrayItem]);

  if (!metadataSchema) {
    return <div style={{ color: 'red' }}>Error: No geoportiaMetadataSchema defined in ui:options</div>;
  }

  const currentMetadata = formData?.metadata ?? (isArraySchema ? [] : {});

  // For array schemas at root level, render the table directly
  if (isArraySchema) {
    return (
      <Box>
        {headerTitle && (
          <Box display="flex" alignItems="center" mb={2}>
            <Typography variant="h6" style={{ fontWeight: 500 }}>
              {headerTitle}
            </Typography>
            <HelpOutlineIcon fontSize="small" style={{ marginLeft: 8, color: '#888' }} />
          </Box>
        )}
        {headerDescription && (
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
            {headerDescription}
          </Typography>
        )}
        <Form
          schema={metadataSchema}
          uiSchema={mergedUiSchema}
          validator={validator}
          formData={currentMetadata}
          onChange={handleChange}
          idPrefix="geoportia-metadata"
          templates={templates}
          widgets={customWidgets}
          formContext={formContext}
          liveValidate
          showErrorList={false}
        >
          <></>
        </Form>
      </Box>
    );
  }

  // Form view mode
  return (
    <Box>
      {headerTitle && (
        <Box display="flex" alignItems="center" mb={2}>
          <Typography variant="h6" style={{ fontWeight: 500 }}>
            {headerTitle}
          </Typography>
          <HelpOutlineIcon fontSize="small" style={{ marginLeft: 8, color: '#888' }} />
        </Box>
      )}
      {headerDescription && (
        <Typography variant="body2" color="textSecondary" style={{ marginBottom: 16 }}>
          {headerDescription}
        </Typography>
      )}
      <Form
        schema={metadataSchema}
        uiSchema={mergedUiSchema}
        validator={validator}
        formData={currentMetadata}
        onChange={handleChange}
        idPrefix="geoportia-metadata"
        templates={templates}
        widgets={customWidgets}
        formContext={formContext}
        liveValidate
        showErrorList={false}
      >
        <></>
      </Form>
    </Box>
  );
};
