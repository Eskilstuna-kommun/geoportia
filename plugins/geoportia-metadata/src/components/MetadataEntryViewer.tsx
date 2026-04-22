import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi, fetchApiRef, discoveryApiRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
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

export interface MetadataEntryViewerProps {
  /**
   * The entity reference of the MetadataEntry entity to display.
   * Example: "metadataentry:default/my-table"
   */
  entityRef: string;

  /**
   * Optional title for the card. Defaults to "Metadata".
   */
  title?: string;

  /**
   * Whether the form is editable. Defaults to true (editable).
   */
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

/**
 * Smart ArrayFieldTemplate that uses TableArrayFieldTemplate for arrays with object items
 */
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

/**
 * A component that displays metadata from a MetadataEntry entity.
 * This component is reusable and can be used in different contexts
 * (Table entities, Views, etc.) by passing the metadata entity reference.
 */
export const MetadataEntryViewer: React.FC<MetadataEntryViewerProps> = ({
  entityRef,
  title = 'Metadata',
  editable = true,
}) => {
  const catalogApi = useApi(catalogApiRef);
  const fetchApi = useApi(fetchApiRef);
  const discoveryApi = useApi(discoveryApiRef);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedMetadata, setEditedMetadata] = useState<Record<string, unknown> | unknown[]>({});
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

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

  // Memoize form templates - must be before any conditional returns
  const templates = useMemo(
    () => ({
      ...createCustomTemplates('Lägg till'),
      ArrayFieldTemplate: SmartArrayFieldTemplate,
    }),
    [],
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
        throw new Error(errorData?.error?.message || `Fel: ${response.statusText}`);
      }
      setSnackbar({ open: true, message: 'Metadata sparad!', severity: 'success' });
      setIsEditing(false);
      // Refresh the entity data
      retry();
    } catch (err: any) {
      setSnackbar({ 
        open: true, 
        message: err?.message || 'Ett fel uppstod vid sparning', 
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

  if (loading) {
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
  const cardAction = editable ? (
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
            Avbryt
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            Spara
          </Button>
        </>
      ) : (
        <Button
          variant="outlined"
          color="primary"
          startIcon={<EditIcon />}
          onClick={handleStartEdit}
        >
          Redigera
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
      </InfoCard>
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
