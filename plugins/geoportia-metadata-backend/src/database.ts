export interface TableRow {
  id: number;
  entity_ref: string;
  database: string;
  name: string;
  version: number;
  active: boolean;
  schema: unknown;
  metadata: unknown;
  title: string;
  owner: string;
  properties: string;
}
export interface AttributeRow {
  table_id: number;
  name: string;
  title: string;
  type: string;
  properties: string;
}
