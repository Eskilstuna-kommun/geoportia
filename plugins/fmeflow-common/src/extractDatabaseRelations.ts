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
  }

  return result;
}
