import React, { FC } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { metadataApiRef } from '../client';
import { useEntity } from '@backstage/plugin-catalog-react';
import useAsync from 'react-use/lib/useAsync';
import { ANNOTATION_LOCATION } from '@backstage/catalog-model';
import {
  Progress,
  ResponseErrorPanel,
  Table,
} from '@backstage/core-components';
import _ from 'lodash';

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export interface PreviewCardProps {}

export const PreviewCard: FC = () => {
  const api = useApi(metadataApiRef);
  const { entity } = useEntity();

  if (entity.kind !== 'Table') {
    throw new Error('Invalid entity kind');
  }
  const { value, loading, error } = useAsync(async () => {
    const resp = await api.getTablePreview({
      path: {
        database: entity.metadata.annotations![ANNOTATION_LOCATION]!,
        table: entity.metadata.name,
      },
    });
    if (resp.status === 404) {
      throw new NotFoundError(`Failed to fetch table preview, not found`);
    } else if (resp.status >= 300) {
      throw new Error(`Failed to fetch table preview, status ${resp.status}`);
    }
    return resp.json();
  }, []);

  if (loading) {
    return <Progress />;
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  } else if (!value) {
    return null;
  }

  return (
    <>
      <Table
        columns={value.columns.map(c => ({ field: c, title: _.startCase(c) }))}
        data={value.head.map(row =>
          Object.fromEntries(row.map((v, i) => [value.columns[i], v])),
        )}
        options={{ search: false, paging: false, padding: 'dense' }}
        title="Sample Data"
      />
    </>
  );
};
