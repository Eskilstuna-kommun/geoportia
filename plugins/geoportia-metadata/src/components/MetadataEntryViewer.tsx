import React, { useMemo } from 'react';
import { Entity } from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  InfoCard,
  Progress,
  ResponseErrorPanel,
  WarningPanel,
} from '@backstage/core-components';
import useAsync from 'react-use/lib/useAsync';
import Form from '@rjsf/material-ui';
import validator from '@rjsf/validator-ajv8';
import type { RJSFSchema, UiSchema as RJSFUiSchema, ArrayFieldTemplateProps } from '@rjsf/utils';
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
   * Whether the form is editable. Defaults to false (readonly).
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
  editable = false,
}) => {
  const catalogApi = useApi(catalogApiRef);

  // Fetch the MetadataEntry entity
  const {
    value: entity,
    loading,
    error,
  } = useAsync(async () => {
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

  return (
    <InfoCard title={title}>
      <Form
        schema={fullSchema}
        uiSchema={uiSchema}
        formData={metadata}
        validator={validator}
        widgets={customWidgets}
        templates={templates}
        disabled={!editable}
        readonly={!editable}
        liveValidate={false}
        showErrorList={false}
      >
        {/* Empty children to hide submit button */}
        <></>
      </Form>
    </InfoCard>
  );
};
