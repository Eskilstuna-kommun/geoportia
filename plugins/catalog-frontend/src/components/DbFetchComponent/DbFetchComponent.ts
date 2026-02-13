import { useApi, configApiRef } from '@backstage/core-plugin-api';

interface ViewTable {
  name: string;
  columns: string[];
}

export class DbFetchComponent {
  private dbHandlerUrl: string;

  constructor() {
    const configApi = useApi(configApiRef);
    const dbBaseUrl =
      configApi.getOptionalString('backend.baseUrl') || 'http://localhost:7007';
    this.dbHandlerUrl = `${dbBaseUrl}/api/postgresql-db-handler`;
  }

  async fetchTables(schemaName: string = "public"): Promise<{ tables: string[] }> {
    const response = await fetch(
      `${this.dbHandlerUrl}/list-tables/${schemaName}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch tables for schema ${schemaName}`);
    }
    return response.json();
  }

  async fetchColumns(
    tableName: string,
    schemaName:string = "public",
  ): Promise<{ columns: string[] }> {
    const response = await fetch(
      `${this.dbHandlerUrl}/list-columns/${schemaName}/${tableName}`,
    );
    if (!response.ok) {
      throw new Error(
        `Failed to fetch columns for table ${tableName} in schema ${schemaName}`,
      );
    }
    return response.json();
  }

  async createView(
    viewName: string,
    tables: ViewTable[],
    schemaName:string = "public",
  ): Promise<void> {
    const response = await fetch(`${this.dbHandlerUrl}/create-view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ viewName, schemaName, tables }),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to create view ${viewName} in schema ${schemaName}`,
      );
    }
  }

  async deleteView(viewName: string, schemaName: string = "public"): Promise<void> {
    const response = await fetch(
      `${this.dbHandlerUrl}/delete-view/${schemaName}/${viewName}`,
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

  async fetchViews(schemaName: string = "public"): Promise<{ views: string[] }> {
    const response = await fetch(
      `${this.dbHandlerUrl}/list-views/${schemaName}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch views for schema ${schemaName}`);
    }
    return response.json();
  }
};
