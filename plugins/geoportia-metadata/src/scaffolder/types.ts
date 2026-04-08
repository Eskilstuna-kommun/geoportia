import type { RJSFSchema, UiSchema as RJSFUiSchema } from '@rjsf/utils';

export interface GeoPortiaMetadataFieldValue {
  schema: RJSFSchema;
  metadata: Record<string, unknown>;
}

export interface GeoPortiaMetadataFieldUiOptions {
  geoportiaMetadataSchema: RJSFSchema;
  geoportiaMetadataUiSchema?: RJSFUiSchema;
  headerTitle?: string;
  headerDescription?: string;
  addButtonText?: string;
  tableView?: boolean;
}

export interface AttributRow {
  namn?: string;
  alias?: string;
  beskrivning?: string;
  skyddsklass?: string;
  doman?: string;
}
