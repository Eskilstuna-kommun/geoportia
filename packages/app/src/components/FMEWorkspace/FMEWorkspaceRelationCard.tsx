import React from 'react';
import { useEntity, EntityRefLink } from '@backstage/plugin-catalog-react';
import { InfoCard, Table } from '@backstage/core-components';
import { RELATION_DEPENDS_ON } from '@backstage/catalog-model';

type TableRelation = {
  database: string;
  schema: string;
  table: string;
};

export const FMEWorkspaceDatabaseRelationsCard = () => {
  const { entity } = useEntity();
  const relations = entity?.relations ?? [];

  const databaseRef = relations
    .find(
      r =>
        r.type === RELATION_DEPENDS_ON && r.targetRef.startsWith('resource:'),
    )
    ?.targetRef.split('/')[1];

  const tables: TableRelation[] = relations
    .filter(
      r => r.type === RELATION_DEPENDS_ON && r.targetRef.startsWith('table:'),
    )
    .map(r => {
      const [, ref] = r.targetRef.split('/');
      const [schema, table] = ref.split('.');
      return {
        database: databaseRef ?? '',
        schema,
        table,
      };
    });

  if (tables.length === 0) {
    return (
      <InfoCard title="Database Relations">
        <p>No database relations found for this workspace.</p>
      </InfoCard>
    );
  }

  return (
    <InfoCard title="Database Relations">
      <Table
        options={{
          paging: false,
          search: false,
          toolbar: false,
          showTitle: false,
        }}
        columns={[
          {
            title: 'Database',
            field: 'database',
            render: rowData => (
              <EntityRefLink
                entityRef={`resource:default/${rowData.database}`}
                defaultKind="Resource"
              />
            ),
          },
          { title: 'Schema', field: 'schema' },
          {
            title: 'Table',
            field: 'table',
            render: rowData => (
              <EntityRefLink
                entityRef={`table:default/${rowData.schema}.${rowData.table}`}
                defaultKind="Table"
              />
            ),
          },
        ]}
        data={tables}
      />
    </InfoCard>
  );
};
