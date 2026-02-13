interface ViewTable {
  name: string;
  columns: string[];
}

export async function fetchTables(
  schemaName: string,
): Promise<{ tables: string[] }> {
  const response = await fetch(
    `http://localhost:7007/api/postgresql-db-handler/list-tables/${schemaName}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch tables for schema ${schemaName}`);
  }
  return response.json();
}

export async function fetchColumns(
  schemaName: string,
  tableName: string,
): Promise<{ columns: string[] }> {
  const response = await fetch(
    `http://localhost:7007/api/postgresql-db-handler/list-columns/${schemaName}/${tableName}`,
  );
  if (!response.ok) {
    throw new Error(
      `Failed to fetch columns for table ${tableName} in schema ${schemaName}`,
    );
  }
  return response.json();
}

export async function createView(
  viewName: string,
  schemaName: string,
  tables: ViewTable[],
): Promise<void> {
  const response = await fetch(
    'http://localhost:7007/api/postgresql-db-handler/create-view',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ viewName, schemaName, tables }),
    },
  );
  console.log('Create View Response:', JSON.stringify(response));
  if (!response.ok) {
    throw new Error(
      `Failed to create view ${viewName} in schema ${schemaName}`,
    );
  }
}

export async function deleteView(
  viewName: string,
  schemaName: string,
): Promise<void> {
  const response = await fetch(
    `http://localhost:7007/api/postgresql-db-handler/delete-view/${schemaName}/${viewName}`,
    {
      method: 'DELETE',
    },
  );
  if (!response.ok) {
    throw new Error(
      `Failed to delete view ${viewName} in schema ${schemaName}`,
    );
  }
}

export async function fetchViews(
  schemaName: string,
): Promise<{ views: string[] }> {
  const response = await fetch(
    `http://localhost:7007/api/postgresql-db-handler/list-views/${schemaName}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch views for schema ${schemaName}`);
  }
  return response.json();
}
