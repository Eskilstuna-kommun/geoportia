import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi, fetchApiRef, discoveryApiRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { usePermission } from '@backstage/plugin-permission-react';
import {
  InfoCard,
  Progress,
  ResponseErrorPanel,
  WarningPanel,
} from '@backstage/core-components';
import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import Form from '@rjsf/material-ui';
import validator from '@rjsf/validator-ajv8';
import type { RJSFSchema, UiSchema as RJSFUiSchema, ArrayFieldTemplateProps } from '@rjsf/utils';
import { Box, Button, CircularProgress, Snackbar } from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import EditIcon from '@material-ui/icons/Edit';
import SaveIcon from '@material-ui/icons/Save';
import CancelIcon from '@material-ui/icons/Cancel';
import { customWidgets } from '../scaffolder/widgets';
import { createCustomTemplates } from '../scaffolder/templates';
import { TableArrayFieldTemplate } from '../scaffolder/TableArrayFieldTemplate';
import { metadataEntryUpdatePermission } from '@internal/backstage-plugin-geoportia-metadata-common';
import { SuggestionsTable, MetadataSuggestion } from './SuggestionsTable';
import { SuggestionDetailDrawer } from './SuggestionDetailDrawer';
import { geoportiaMetadataTranslationRef } from '../translation';

export interface MetadataEntryViewerProps {
  entityRef: string;
  title?: string;
  editable?: boolean;
}

/**
 * Type guard to check if an entity is a MetadataEntry
 */
function isMetadataEntry(entity: Entity): boolean {
  return (
    entity.apiVersion === 'geoportia.se/v1alpha1' &&
    entity.kind === 'MetadataEntry'
  );
}

const SmartArrayFieldTemplate = (props: ArrayFieldTemplateProps) => {
  if (
    props.schema?.items &&
    typeof props.schema.items === 'object' &&
    !Array.isArray(props.schema.items)
  ) {
    return <TableArrayFieldTemplate {...props} />;
  }
  return null;
};

export const MetadataEntryViewer: React.FC<MetadataEntryViewerProps> = ({
  entityRef,
  title = 'Metadata',
  editable = true,
}) => {
  const catalogApi = useApi(catalogApiRef);
  const fetchApi = useApi(fetchApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const { t } = useTranslationRef(geoportiaMetadataTranslationRef);

  // Check if user has permission to update metadata
  const { allowed: canUpdate, loading: permissionLoading } = usePermission({
    permission: metadataEntryUpdatePermission,
    resourceRef: entityRef,
  });

  // User can edit if both the prop allows it AND they have permission
  const canEdit = editable && canUpdate;

  const [isEditing, setIsEditing] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState<Record<string, unknown> | unknown[]>({});
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Suggestion drawer state
  const [selectedSuggestion, setSelectedSuggestion] = useState<MetadataSuggestion | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch the MetadataEntry entity
  const {
    value: entity,
    loading,
    error,
    retry,
  } = useAsyncRetry(async () => {
    const response = await catalogApi.getEntityByRef(entityRef);
    return response;
  }, [entityRef]);

  // Fetch suggestions for this metadata entry
  const {
    value: suggestions = [],
    loading: suggestionsLoading,
    retry: retrySuggestions,
  } = useAsyncRetry(async () => {
    const baseUrl = await discoveryApi.getBaseUrl('geoportia-metadata');
    const response = await fetchApi.fetch(
      `${baseUrl}/${encodeURIComponent(entityRef)}/suggestions`
    );
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to fetch suggestions: ${response.statusText}`);
    }
    return (await response.json()) as MetadataSuggestion[];
  }, [entityRef, discoveryApi, fetchApi]);

  // Handle suggestion row click
  const handleSuggestionClick = useCallback((suggestion: MetadataSuggestion) => {
    setSelectedSuggestion(suggestion);
    setDrawerOpen(true);
  }, []);

  // Handle drawer close
  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false);
    setSelectedSuggestion(null);
  }, []);

  // Handle suggestion accepted
  const handleSuggestionAccepted = useCallback(() => {
    setSnackbar({ open: true, message: t('suggestionDetail.acceptSuccess'), severity: 'success' });
    retry();
    retrySuggestions();
  }, [retry, retrySuggestions, t]);

  // Memoize form templates - must be before any conditional returns
  const templates = useMemo(
    () => ({
      ...createCustomTemplates(t('metadataViewer.addItem')),
      ArrayFieldTemplate: SmartArrayFieldTemplate,
    }),
    [t],
  );

  // Extract schema and metadata from the entity spec
  const schema = (entity?.spec?.schema as RJSFSchema) ?? {};
  const metadata = (entity?.spec?.metadata as Record<string, unknown>) ?? {};

  // Check if schema is array type
  const isArraySchema = schema.type === 'array';

  // Build the full schema with proper type
  const fullSchema: RJSFSchema = useMemo(
    () => (isArraySchema ? schema : { type: 'object', ...schema }),
    [schema, isArraySchema],
  );

  // Build UI schema with fullWidth defaults for string fields - must be before any conditional returns
  const uiSchema: RJSFUiSchema = useMemo(() => {
    const defaultUi: RJSFUiSchema = {};
    const schemaProps = schema.properties as Record<string, unknown> | undefined;

    if (schemaProps) {
      Object.keys(schemaProps).forEach(key => {
        const prop = schemaProps[key] as { type?: string; enum?: unknown[] } | undefined;
        if (prop?.type === 'string' && !prop?.enum) {
          defaultUi[key] = { 'ui:options': { fullWidth: true } };
        }
      });
    }

    return defaultUi;
  }, [schema]);

  // Ref to track current edited metadata for array callbacks
  const currentMetadataRef = useRef<unknown[] | Record<string, unknown>>(metadata);
  currentMetadataRef.current = isEditing ? editedMetadata : metadata;

  // Callback to add item directly to root array
  const addArrayItem = useCallback((item: unknown) => {
    if (!isArraySchema) return;
    const currentArray = Array.isArray(currentMetadataRef.current) ? currentMetadataRef.current : [];
    const newArray = [...currentArray, item];
    setEditedMetadata(newArray);
  }, [isArraySchema]);

  // Callback to update an existing item in root array
  const updateArrayItem = useCallback((index: number, item: unknown) => {
    if (!isArraySchema) return;
    const currentArray = Array.isArray(currentMetadataRef.current) ? currentMetadataRef.current : [];
    const newArray = [...currentArray];
    if (index >= 0 && index < newArray.length) {
      newArray[index] = item;
      setEditedMetadata(newArray);
    }
  }, [isArraySchema]);

  // Callback to delete an item from root array
  const deleteArrayItem = useCallback((index: number) => {
    if (!isArraySchema) return;
    const currentArray = Array.isArray(currentMetadataRef.current) ? currentMetadataRef.current : [];
    const newArray = currentArray.filter((_, i) => i !== index);
    setEditedMetadata(newArray);
  }, [isArraySchema]);

  // Form context to pass callbacks to nested components
  const formContext = useMemo(() => ({
    addArrayItem: isArraySchema ? addArrayItem : undefined,
    updateArrayItem: isArraySchema ? updateArrayItem : undefined,
    deleteArrayItem: isArraySchema ? deleteArrayItem : undefined,
  }), [isArraySchema, addArrayItem, updateArrayItem, deleteArrayItem]);

  // Handle starting edit mode
  const handleStartEdit = useCallback(() => {
    setEditedMetadata(metadata);
    setIsEditing(true);
  }, [metadata]);

  // Handle canceling edit mode
  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditedMetadata({});
  }, []);

  // Handle form data changes
  const handleChange = useCallback(
    (data: { formData?: Record<string, unknown> | unknown[] }) => {
      setEditedMetadata(data.formData ?? (isArraySchema ? [] : {}));
    },
    [isArraySchema],
  );

  // Handle saving changes
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      const baseUrl = await discoveryApi.getBaseUrl('geoportia-metadata');
      const response = await fetchApi.fetch(
        `${baseUrl}/${encodeURIComponent(entityRef)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schema: schema as Record<string, unknown>,
            metadata: editedMetadata as Record<string, unknown>,
          }),
        },
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `${t('common.error')}: ${response.statusText}`);
      }
      setSnackbar({ open: true, message: t('metadataViewer.saved'), severity: 'success' });
      setIsEditing(false);
      // Refresh the entity data
      retry();
    } catch (err: any) {
      setSnackbar({ 
        open: true, 
        message: err?.message || t('metadataViewer.saveError'), 
        severity: 'error' 
      });
    } finally {
      setSaving(false);
    }
  }, [fetchApi, discoveryApi, entityRef, schema, editedMetadata, retry]);

  // Handle snackbar close
  const handleSnackbarClose = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  if (loading || permissionLoading) {
    return (
      <InfoCard title={title}>
        <Progress />
      </InfoCard>
    );
  }

  if (error) {
    return (
      <InfoCard title={title}>
        <ResponseErrorPanel error={error} />
      </InfoCard>
    );
  }

  if (!entity) {
    return (
      <InfoCard title={title}>
        <WarningPanel title="Metadata not found">
          No metadata entity found for reference: {entityRef}
        </WarningPanel>
      </InfoCard>
    );
  }

  if (!isMetadataEntry(entity)) {
    return (
      <InfoCard title={title}>
        <WarningPanel title="Invalid entity type">
          The referenced entity is not a MetadataEntry.
        </WarningPanel>
      </InfoCard>
    );
  }

  // Card actions - edit/save/cancel buttons
  const cardAction = canEdit ? (
    <Box display="flex" gridGap={8}>
      {isEditing ? (
        <>
          <Button
            variant="outlined"
            color="default"
            startIcon={<CancelIcon />}
            onClick={handleCancel}
            disabled={saving}
          >
            {t('metadataViewer.buttons.cancel')}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {t('metadataViewer.buttons.save')}
          </Button>
        </>
      ) : (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<EditIcon />}
          onClick={handleStartEdit}
        >
          {t('metadataViewer.buttons.edit')}
        </Button>
      )}
    </Box>
  ) : undefined;

  const currentFormData = isEditing ? editedMetadata : metadata;

  return (
    <>
      <InfoCard title={title} action={cardAction}>
        <Form
          schema={fullSchema}
          uiSchema={uiSchema}
          formData={currentFormData}
          validator={validator}
          widgets={customWidgets}
          templates={templates}
          formContext={formContext}
          onChange={isEditing ? handleChange : undefined}
          disabled={!isEditing}
          readonly={!isEditing}
          liveValidate={isEditing}
          showErrorList={false}
        >
          {/* Empty children to hide submit button */}
          <></>
        </Form>
        
        {/* Suggestions section */}
        <SuggestionsTable
          suggestions={suggestions}
          loading={suggestionsLoading}
          onRowClick={handleSuggestionClick}
        />
      </InfoCard>

      {/* Suggestion detail drawer */}
      <SuggestionDetailDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        suggestion={selectedSuggestion}
        currentMetadata={metadata as Record<string, unknown>}
        schema={schema as Record<string, unknown>}
        entityRef={entityRef}
        onAccepted={handleSuggestionAccepted}
      />

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={5000} 
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
