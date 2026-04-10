import type { RJSFSchema, UiSchema as RJSFUiSchema } from '@rjsf/utils';

export interface GeoPortiaMetadataFieldValue {
  schema: RJSFSchema;
  metadata: Record<string, unknown> | unknown[];
}

export interface GeoPortiaMetadataFieldUiOptions {
  geoportiaMetadataSchema: RJSFSchema;
  geoportiaMetadataUiSchema?: RJSFUiSchema;
  headerTitle?: string;
  headerDescription?: string;
}
