import React, { useCallback, useMemo } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import Form from '@rjsf/material-ui';
import validator from '@rjsf/validator-ajv8';
import type { RJSFSchema, UiSchema as RJSFUiSchema } from '@rjsf/utils';
import { Typography, Box } from '@material-ui/core';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';

import { customWidgets } from './widgets';
import { createCustomTemplates } from './templates';
import { TableView } from './TableView';
import type { GeoPortiaMetadataFieldValue, GeoPortiaMetadataFieldUiOptions, AttributRow } from './types';

export type { GeoPortiaMetadataFieldValue, GeoPortiaMetadataFieldUiOptions };

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
  const addButtonText = uiOptions?.addButtonText ?? 'Skapa nytt attribut';
  const tableView = uiOptions?.tableView ?? false;

  // Ensure schema has proper structure
  const metadataSchema = useMemo((): RJSFSchema | undefined => {
    if (!rawMetadataSchema) return undefined;
    return { type: 'object', ...rawMetadataSchema };
  }, [rawMetadataSchema]);

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

  // Get item schema for table view edit dialog
  const itemSchema = useMemo((): RJSFSchema | undefined => {
    const schemaProps = rawMetadataSchema?.properties as Record<string, any>;
    const arrayProp = schemaProps?.attribut;
    if (arrayProp?.items) {
      return { type: 'object', ...arrayProp.items };
    }
    return undefined;
  }, [rawMetadataSchema]);

  // Templates for the form
  const templates = useMemo(() => createCustomTemplates(addButtonText), [addButtonText]);

  // Handle form data changes
  const handleChange = useCallback(
    (data: { formData?: Record<string, unknown> }) => {
      if (!rawMetadataSchema) return;
      onChange({ schema: rawMetadataSchema, metadata: data.formData ?? {} });
    },
    [rawMetadataSchema, onChange],
  );

  // Handle table rows change
  const handleRowsChange = useCallback(
    (rows: AttributRow[]) => {
      handleChange({ formData: { attribut: rows } });
    },
    [handleChange],
  );

  if (!metadataSchema) {
    return <div style={{ color: 'red' }}>Error: No geoportiaMetadataSchema defined in ui:options</div>;
  }

  const currentMetadata = formData?.metadata ?? {};

  // Table view mode
  if (tableView) {
    const rows: AttributRow[] = (currentMetadata as any)?.attribut || [];
    return (
      <TableView
        headerTitle={headerTitle}
        addButtonText={addButtonText}
        rows={rows}
        itemSchema={itemSchema}
        onRowsChange={handleRowsChange}
      />
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
        liveValidate
        showErrorList={false}
      >
        <></>
      </Form>
    </Box>
  );
};
