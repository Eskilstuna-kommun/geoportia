export interface TableRow {
  id: number;
  entity_ref: string;
  schema: unknown;
  metadata: unknown;
}

export interface DatasetRow {
  id: number;
  name: string;
  summary: string | null;
  versioning: string;
  allow_z_values: boolean;
  status: string;
  created_at: string;
}