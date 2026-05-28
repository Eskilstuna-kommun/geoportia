
export type DatasetEntry = {
  id: string;
  entityRef?: string;
  isDeleted?: boolean;
  titel: string;
  sammanfattning: string;
  signaturstatus: 'error' | 'warning' | 'success';
  skyddsklass: 'green' | 'yellow' | 'red';
  oppenData: boolean;
};
