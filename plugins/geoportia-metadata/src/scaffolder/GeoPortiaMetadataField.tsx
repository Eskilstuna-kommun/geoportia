import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import Form from '@rjsf/material-ui';
import validator from '@rjsf/validator-ajv8';
import type { RJSFSchema, UiSchema as RJSFUiSchema, ArrayFieldTemplateProps } from '@rjsf/utils';
import { Typography, Box, Grid, CircularProgress, Paper, Chip } from '@material-ui/core';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import PersonIcon from '@material-ui/icons/Person';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import { useApi, identityApiRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { useAsync } from 'react-use';
import { JsonObject } from '@backstage/types';

import { customWidgets } from './widgets';
import { createCustomTemplates } from './templates';
import { TableArrayFieldTemplate } from './TableArrayFieldTemplate';
import { MetadataInfoPanel } from './MetadataInfoPanel';
import type { GeoPortiaMetadataFieldValue, GeoPortiaMetadataFieldUiOptions } from './types';
import { geoportiaMetadataTranslationRef } from '../translation';

export type { GeoPortiaMetadataFieldValue, GeoPortiaMetadataFieldUiOptions };

const SmartArrayFieldTemplate = (props: ArrayFieldTemplateProps) => {
  if (props.schema?.items && typeof props.schema.items === 'object' && !Array.isArray(props.schema.items)) {
    return <TableArrayFieldTemplate {...props} />;
  }
  
  return null;
};

export const GeoPortiaMetadataField = (
  props: FieldExtensionComponentProps<GeoPortiaMetadataFieldValue>,
) => {
  const { onChange, formData, uiSchema, formContext } = props;

  const { t } = useTranslationRef(geoportiaMetadataTranslationRef);
  const catalogApi = useApi(catalogApiRef);
  const identityApi = useApi(identityApiRef);

  const { value: currentUser } = useAsync(async () => {
    const identity = await identityApi.getBackstageIdentity();
    return identity.userEntityRef || null;
  }, [identityApi]);

  // TODO: Implement proper state management for sidebar data
  const panelData = { uuid: undefined, createdAt: undefined, createdBy: undefined, attachedFiles: [] as { name: string }[], adminComment: '' };
  const updateFiles = () => {};
  const updateComment = () => {};
  
  const uiOptions = uiSchema?.['ui:options'] as GeoPortiaMetadataFieldUiOptions | undefined;
  const rawMetadataSchema = uiOptions?.geoportiaMetadataSchema;
  const metadataUiSchema = uiOptions?.geoportiaMetadataUiSchema;
  const headerTitle = uiOptions?.headerTitle;
  const headerDescription = uiOptions?.headerDescription;
  const showSidebar = uiOptions?.showSidebar ?? false;
  const prefillFromEntity = uiOptions?.prefillFromEntity;
  const requireEntityRef = uiOptions?.requireEntityRef ?? false;

  // Get entity ref from formContext (sibling field in same form step)
  const entityRefFromContext = formContext?.formData?.entityRef as string | undefined;
  const effectiveEntityRef = prefillFromEntity || entityRefFromContext;

  const prefillAppliedRef = useRef<string | null>(null);

  const {
    value: prefillData,
    loading: isLoadingPrefill,
    error: prefillError,
  } = useAsync(async () => {
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

  useEffect(() => {
    if (
      prefillData?.metadata &&
      rawMetadataSchema &&
      effectiveEntityRef &&
      prefillAppliedRef.current !== effectiveEntityRef
    ) {
      prefillAppliedRef.current = effectiveEntityRef;
      onChange({
        schema: { type: 'object', ...rawMetadataSchema },
        metadata: prefillData.metadata,
      });
    }
  }, [prefillData, rawMetadataSchema, effectiveEntityRef, onChange]);

  const isArraySchema = rawMetadataSchema?.type === 'array';

  const metadataSchema = useMemo((): RJSFSchema | undefined => {
    if (!rawMetadataSchema) return undefined;
    if (isArraySchema) {
      return rawMetadataSchema;
    }
    return { type: 'object', ...rawMetadataSchema };
  }, [rawMetadataSchema, isArraySchema]);

  const mergedUiSchema = useMemo((): RJSFUiSchema => {
    const defaultUi: RJSFUiSchema = {};
    const schemaProps = rawMetadataSchema?.properties;
    if (schemaProps) {
      Object.keys(schemaProps).forEach((key) => {
        const propSchema = schemaProps[key];
        if (typeof propSchema !== 'object') {
          defaultUi[key] = metadataUiSchema?.[key] || {};
          return;
        }
        const propType = propSchema?.type;
        if (propType === 'string' && !propSchema?.enum) {
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
      if (!metadataSchema) return;
      onChange({ schema: metadataSchema, metadata: data.formData ?? (isArraySchema ? [] : {}) });
    },
    [metadataSchema, onChange, isArraySchema],
  );

  // Callback to add item directly to root array - used by TableArrayFieldTemplate 
  const addArrayItem = useCallback((item: unknown) => {
    if (!metadataSchema || !isArraySchema) return;
    const currentArray = Array.isArray(currentMetadataRef.current) ? currentMetadataRef.current : [];
    const newArray = [...currentArray, item];
    onChange({ schema: metadataSchema, metadata: newArray });
  }, [metadataSchema, isArraySchema, onChange]);

  // Callback to update an existing item in root array
  const updateArrayItem = useCallback((index: number, item: unknown) => {
    if (!metadataSchema || !isArraySchema) return;
    const currentArray = Array.isArray(currentMetadataRef.current) ? currentMetadataRef.current : [];
    const newArray = [...currentArray];
    if (index >= 0 && index < newArray.length) {
      newArray[index] = item;
      onChange({ schema: metadataSchema, metadata: newArray });
    }
  }, [metadataSchema, isArraySchema, onChange]);

  // Callback to delete an item from root array
  const deleteArrayItem = useCallback((index: number) => {
    if (!metadataSchema || !isArraySchema) return;
    const currentArray = Array.isArray(currentMetadataRef.current) ? currentMetadataRef.current : [];
    const newArray = currentArray.filter((_, i) => i !== index);
    onChange({ schema: metadataSchema, metadata: newArray });
  }, [metadataSchema, isArraySchema, onChange]);

  const rjsfFormContext = useMemo(() => ({
    addArrayItem: isArraySchema ? addArrayItem : undefined,
    updateArrayItem: isArraySchema ? updateArrayItem : undefined,
    deleteArrayItem: isArraySchema ? deleteArrayItem : undefined,
    parentFormData: formData?.metadata,
  }), [isArraySchema, addArrayItem, updateArrayItem, deleteArrayItem, formData?.metadata]);

  if (isLoadingPrefill) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" p={4}>
        <CircularProgress size={24} />
        <Typography variant="body2" style={{ marginLeft: 8 }}>
          {t('metadataField.loading')}
        </Typography>
      </Box>
    );
  }

  if (prefillError) {
    return (
      <Box p={2}>
        <Typography variant="body2" color="error">
          {prefillError.message || t('metadataField.fetchError')}
        </Typography>
      </Box>
    );
  }

  if (!metadataSchema) {
    return <div style={{ color: 'red' }}>{t('metadataField.noSchemaError')}</div>;
  }

  if (requireEntityRef && !effectiveEntityRef) {
    return (
      <Paper variant="outlined" style={{ padding: 24, backgroundColor: '#f5f5f5' }}>
        <Box display="flex" alignItems="center" justifyContent="center" flexDirection="column" py={4}>
          <InfoOutlinedIcon style={{ fontSize: 48, color: '#9e9e9e', marginBottom: 16 }} />
          <Typography variant="body1" color="textSecondary" align="center">
            {t('metadataField.selectEntityPrompt')}
          </Typography>
        </Box>
      </Paper>
    );
  }

  const currentMetadata = formData?.metadata ?? (isArraySchema ? [] : {});

  // Format user display name from entity ref
  const formatUserName = (userRef: string | null) => {
    if (!userRef) return t('metadataField.unknownUser');
    // Extract name from user:default/username format
    const match = userRef.match(/user:[^/]+\/(.+)/);
    return match ? match[1] : userRef;
  };

  // Render the form content
  const renderFormContent = () => (
    <>
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
      {requireEntityRef && currentUser && (
        <Box mb={2}>
          <Chip
            icon={<PersonIcon />}
            label={`${t('metadataField.suggestedByLabel')} ${formatUserName(currentUser)}`}
            variant="outlined"
            size="small"
            color="primary"
          />
        </Box>
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
        formContext={rjsfFormContext}
        liveValidate
        showErrorList={false}
      >
        <></>
      </Form>
    </>
  );

  const renderSidebar = () => (
    <MetadataInfoPanel
      uuid={panelData.uuid}
      createdAt={panelData.createdAt}
      createdBy={panelData.createdBy}
      attachedFiles={panelData.attachedFiles}
      adminComment={panelData.adminComment}
      onFilesChange={updateFiles}
      onCommentChange={updateComment}
    />
  );

  // For array schemas at root level, render the table directly
  if (isArraySchema) {
    if (showSidebar) {
      return (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            {renderFormContent()}
          </Grid>
          <Grid item xs={12} md={4}>
            {renderSidebar()}
          </Grid>
        </Grid>
      );
    }

    return <Box>{renderFormContent()}</Box>;
  }

  // Form view mode
  if (showSidebar) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {renderFormContent()}
        </Grid>
        <Grid item xs={12} md={4}>
          {renderSidebar()}
        </Grid>
      </Grid>
    );
  }

  return <Box>{renderFormContent()}</Box>;
};
