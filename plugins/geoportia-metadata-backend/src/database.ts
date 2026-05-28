export interface TableRow {
  id: number;
  entity_ref: string;
  schema: unknown;
  metadata: unknown;
  deleted: boolean;
}

export interface SuggestionTableRow {
  id: number;
  metadata_id: number;
  metadata: unknown;
  created_at: Date;
  suggested_by: string;
}