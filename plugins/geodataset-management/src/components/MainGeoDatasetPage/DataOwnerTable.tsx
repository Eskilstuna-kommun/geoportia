import { Progress } from '@backstage/core-components';
import { Box, Button, Typography } from '@material-ui/core';
import React from 'react';
import { DataTable } from '../DataTable';
import { useDataOwners } from '../../hooks/useDataOwners';
import { useDataOwnerTableColumns } from './DataOwnerTableColumns';
import { geodatasetManagementTranslationRef } from '../../translation';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';

export const DataOwnerTable = () => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  const { value, loading, error, retry } = useDataOwners();
  const columns = useDataOwnerTableColumns(
    value?.groupsByRef ?? new Map(),
    value?.usersByRef ?? new Map(),
  );

  if (loading) return <Progress />;

  if (error) {
    return (
      <Box role="alert" p={2}>
        <Typography color="error" gutterBottom>
          {t('dataOwnerTable.loadError')}
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {error.message}
        </Typography>
        <Button onClick={retry} color="primary">
          {t('dataOwnerTable.retry')}
        </Button>
      </Box>
    );
  }

  const owners = value?.owners ?? [];
  if (owners.length === 0) {
    return (
      <Box p={3}>
        <Typography>{t('dataOwnerTable.empty')}</Typography>
      </Box>
    );
  }

  return (
    <>
      <Typography variant="h5" gutterBottom>
        {t('pageTitle.dataOwner')}
      </Typography>
      <DataTable
        title=""
        columns={columns}
        data={owners}
        options={{
          search: true,
          paging: true,
          pageSize: 25,
          sorting: true,
          selection: false,
          padding: 'dense',
        }}
      />
    </>
  );
};
