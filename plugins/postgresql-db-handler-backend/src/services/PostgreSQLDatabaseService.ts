import { Pool } from 'pg';
import { LoggerService } from '@backstage/backend-plugin-api';

export interface ViewTable {
  name: string;
  columns: string[];
}

export class PostgreSQLDatabaseService {
  private pool: Pool;
  constructor(
    private uri: string,
    private logger: LoggerService,
  ) {
    this.pool = new Pool({
      connectionString: this.uri,
    });
  }

  /**
   * Creates a view in the PostgreSQL database.
   *
   * @param viewName The name of the view to be created.
   * @param columns The columns to be included in the view.
   * @param tableName The name of the table from which to select the columns.
   * @param schemaName The schema where the view will be created.
   * @returns A promise that resolves when the view is created.
   */
  async createView(viewName: string, schemaName: string, tables: ViewTable[]) {
    if (tables.length === 0) {
      this.logger.error('No tables provided for view creation.');
      return;
    }

    const tableList = tables
      .map((t, i) => `${schemaName}.${t.name} t${i}`)
      .join(', ');

    const columnsList = tables
      .map((t, i) => t.columns.map(col => `t${i}.${col}`).join(', '))
      .join(', ');

    const query = `CREATE VIEW ${schemaName}.${viewName} AS SELECT ${columnsList} FROM ${tableList};`;

    try {
      await this.pool.query(query);
      this.logger.info(`View ${schemaName}.${viewName} created successfully.`);
    } catch (err) {
      this.logger.error(`Error creating view: ${err}`);
    }
  }

  /**
   * Gets a list of all columns in a specific view within a schema.
   *
   * @param viewName The view name to query.
   * @param schemaName The schema name to query.
   * @returns A promise that resolves to an array of column names.
   */
  private async getViewColumns(viewName: string, schemaName: string) {
    const query = `SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = '${schemaName}'
    AND table_name = '${viewName}';`;

    try {
      const res = await this.pool.query(query);
      return res.rows;
    } catch (err) {
      this.logger.error(`Error fetching view columns: ${err}`);
      return [];
    }
  }

  /**
   * Gets a list of all views in a specific schema.
   *
   * @param schemaName The schema name to query.
   * @returns A promise that resolves to an array of view names.
   */
  async getViews(schemaName: string) {
    const query = `SELECT table_name
    FROM information_schema.views
    WHERE table_schema = '${schemaName}'
    AND table_name NOT IN ('geography_columns', 'geometry_columns');`;

    try {
      const res = await this.pool.query(query);
      return res.rows.map(row => row.table_name);
    } catch (err) {
      this.logger.error(`Error fetching views: ${err}`);
      return [];
    } 
  }

  /**
   * Deletes a view from the database.
   *
   * @param viewName The name of the view to be deleted.
   * @param schemaName The schema where the view is located.
   */
  async deleteView(viewName: string, schemaName: string) {
    const query = `DROP VIEW IF EXISTS ${schemaName}.${viewName}`;

    try {
      await this.pool.query(query);
      this.logger.info(`View ${schemaName}.${viewName} deleted successfully.`);
    } catch (err) {
      this.logger.error(`Error deleting view: ${err}`);
    }
  }

  /**
   * Gets a list of all tables in a specific schema.
   *
   * @param schemaName The schema name to query.
   * @returns A promise that resolves to an array of table names.
   */
  async getTables(schemaName: string) {
    const query = `SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = '${schemaName}'
    AND table_type = 'BASE TABLE'
    AND table_name != 'spatial_ref_sys';`;

    try {
      const res = await this.pool.query(query);
      return res.rows.map(row => row.table_name);
    } catch (err) {
      this.logger.error(`Error fetching tables: ${err}`);
      return [];
    }
  }

  /**
   * Gets a list of all columns in a specific table within a schema.
   *
   * @param schemaName The name of the schema to query.
   * @param tableName The name of the table to get columns for.
   * @returns A promise that resolves to an array of column names.
   */
  async getTableColumns(tableName: string, schemaName: string) {
    const query = `SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = '${tableName}'
    AND table_name = '${schemaName}';`;

    try {
      const res = await this.pool.query(query);
      return res.rows.map(row => row.column_name);
    } catch (err) {
      this.logger.error(`Error fetching table columns: ${err}`);
      return [];
    }
  }
}
