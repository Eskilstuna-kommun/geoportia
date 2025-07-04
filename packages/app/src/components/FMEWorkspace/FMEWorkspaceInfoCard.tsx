import React from 'react';
import { useEntity } from '@backstage/plugin-catalog-react';
import { InfoCard, Table } from '@backstage/core-components';
import { format } from 'date-fns';

export const FMEWorkspaceInfoCard = () => {
  const { entity } = useEntity();

  const name = entity.metadata.title ?? 'N/A';
  const type = typeof entity.spec?.type === 'string'
    ? entity.spec.type
    : JSON.stringify(entity.spec?.type ?? 'N/A');

  let lastUpdated = 'Unknown';
  const rawLastUpdated = entity.spec?.lastUpdated;

  if (typeof rawLastUpdated === 'string' || typeof rawLastUpdated === 'number') {
    try {
      lastUpdated = format(new Date(rawLastUpdated), 'PPP p');
    } catch {
      lastUpdated = 'Invalid date';
    }
  }

  return (
    <InfoCard title="FME Workspace Info">
      <Table
        options={{ paging: false, search: false, toolbar: false, showTitle: false }}
        columns={[
          { title: 'Name', field: 'name' },
          { title: 'Type', field: 'type' },
          { title: 'Last Updated', field: 'lastUpdated' },
        ]}
        data={[
          {
            name,
            type,
            lastUpdated,
          },
        ]}
      />
    </InfoCard>
  );
};
