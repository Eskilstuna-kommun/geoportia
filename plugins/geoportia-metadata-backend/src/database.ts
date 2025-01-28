export interface TableRow {
  id: number;
  database: string;
  name: string;
  version: number;
  active: boolean;
  title: string;
  owner: string;
  properties: Record<string, any>;
}
export interface AttributeRow {
  table_id: number;
  name: string;
  title: string;
  type: string;
  properties: Record<string, any>;
}
