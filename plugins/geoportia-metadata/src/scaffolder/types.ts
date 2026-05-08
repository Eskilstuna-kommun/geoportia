import type { RJSFSchema, UiSchema as RJSFUiSchema } from '@rjsf/utils';

export interface AttachedFile {
  name: string;
  size?: number;
  type?: string;
  data?: string; // base64 encoded
}

export interface GlobalSidebarData {
  uuid?: string;
  createdAt?: string;
  createdBy?: string;
  attachedFiles: AttachedFile[];
  adminComment: string;
}

export interface GeoPortiaMetadataFieldValue {
  schema: RJSFSchema;
  metadata: Record<string, unknown> | unknown[];
}

export interface GeoPortiaMetadataFieldUiOptions {
  geoportiaMetadataSchema: RJSFSchema;
  geoportiaMetadataUiSchema?: RJSFUiSchema;
  headerTitle?: string;
  headerDescription?: string;
  showSidebar?: boolean;
  prefillFromEntity?: string;
}
