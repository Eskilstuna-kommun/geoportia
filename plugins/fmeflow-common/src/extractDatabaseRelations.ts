export interface DatabaseRelation {
  database?: string;
  dataset?: string;
  tables: { schema: string; table: string }[];
}

export interface FMELogEntry {
  line: string;
  message: string;
}

export function extractDatabaseRelationsFromLogEntries(
  entries: FMELogEntry[],
): DatabaseRelation {
  const result: DatabaseRelation = {
    database: undefined,
    dataset: undefined,
    tables: [],
  };

  const seenTables = new Set<string>();

  for (const entry of entries) {
    const line = entry.message;

    // POSTGIS patterns (existing)
    // Match any line mentioning FeatureReader and POSTGIS and dataset
    if (/FeatureReader.*dataset/i.test(line)) {
      const match = line.match(/dataset\s+['`]?(.*?)['`]?(?:'|$)/i);
      if (match) {
        result.database = match[1].trim();
      }
    }

    // Match lines with POSTGIS and 'dataset' keyword
    if (/POSTGIS.*dataset/i.test(line)) {
      const match = line.match(/dataset\s+['`]?(.*?)['`]?(?:'|$)/i);
      if (match) {
        result.dataset = match[1].trim();
      }
    }

    // Match any line reading a table (loosely)
    if (/reading.*table/i.test(line)) {
      const match = line.match(/'(.+?)\.(.+?)'/);
      if (match) {
        const key = `${match[1]}.${match[2]}`;
        if (!seenTables.has(key)) {
          seenTables.add(key);
          result.tables.push({ schema: match[1], table: match[2] });
        }
      }
    }

    // Match SQLExecutor and FeatureReader "select * from ..."
    if (/Executing.*query/i.test(line)) {
      const matches = [...line.matchAll(/"(\w+)"\."(\w+)"/g)];
      for (const m of matches) {
        const key = `${m[1]}.${m[2]}`;
        if (!seenTables.has(key)) {
          seenTables.add(key);
          result.tables.push({ schema: m[1], table: m[2] });
        }
      }
    }

    // ArcGIS SDE patterns
    // Match connection to server and dataset
    if (/Connection made to server/i.test(line)) {
      const serverMatch = line.match(/server\s+'([^']+)'/i);
      const datasetMatch = line.match(/dataset\s+'([^']+)'/i);

      if (serverMatch && !result.database) {
        result.database = serverMatch[1].trim();
      }
      if (datasetMatch && !result.dataset) {
        result.dataset = datasetMatch[1].trim();
      }
    }

    // Match Geodatabase Writer with WHERE clause
    if (/Geodatabase Writer.*WHERE clause/i.test(line)) {
      const match = line.match(
        /([A-Za-z_]\w*)\.([A-Za-z_]\w*)\.([A-Za-z_]\w*)/,
      );
      if (match) {
        const key = `${match[2]}.${match[3]}`;
        if (!seenTables.has(key)) {
          seenTables.add(key);
          result.tables.push({ schema: match[2], table: match[3] });
        }
      }
    }

    // Match Esri Geodatabase Writer truncating feature type
    if (/Esri Geodatabase Writer.*Truncating feature type/i.test(line)) {
      const match = line.match(/`([A-Za-z_]\w*)\.([A-Za-z_]\w*)/);
      if (match) {
        const key = `${match[1]}.${match[2]}`;
        if (!seenTables.has(key)) {
          seenTables.add(key);
          result.tables.push({ schema: match[1], table: match[2] });
        }
      }
    }

    // Match GEODATABASE_SDE reader with Reading feature type
    if (/GEODATABASE_SDE.*Reading feature type/i.test(line)) {
      const match = line.match(/'([A-Za-z_]\w*)\.([^/]+)\/([^']+)'/);
      if (match) {
        const key = `${match[1]}.${match[3]}`;
        if (!seenTables.has(key)) {
          seenTables.add(key);
          result.tables.push({ schema: match[1], table: match[3] });
        }
      }
    }

    // Generic pattern for schema.table in quotes or backticks
    // This catches other ArcGIS SDE patterns that might have schema.table format
    if (/Geodatabase|GEODATABASE_SDE|Esri/i.test(line)) {
      // Match patterns like 'schema.table' or `schema.table`
      const matches = [
        ...line.matchAll(/['`]([A-Za-z_]\w*)\.([A-Za-z_]\w*)['`]/g),
      ];
      for (const match of matches) {
        const key = `${match[1]}.${match[2]}`;
        if (!seenTables.has(key)) {
          seenTables.add(key);
          result.tables.push({ schema: match[1], table: match[2] });
        }
      }
    }
  }

  return result;
}
