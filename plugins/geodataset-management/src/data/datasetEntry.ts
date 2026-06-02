export type DatasetEntry = {
  id: string;
  entityRef?: string;
  isDeleted?: boolean;
  signaturstatus: 'error' | 'warning' | 'success';
  titel: string;
  skyddsklass: 'green' | 'yellow' | 'red';
  sammanfattning: string;
  oppenData: boolean;
  uuid?: string;
  protectionClassLabel?: string;
  contactPerson?: string[];
  schema?: Record<string, unknown>;
  metadataValues?: Record<string, unknown>;
};
