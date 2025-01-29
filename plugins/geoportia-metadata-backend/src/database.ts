export interface TableRow {
  id: number;
  database: string;
  name: string;
  version: number;
  active: boolean;
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
