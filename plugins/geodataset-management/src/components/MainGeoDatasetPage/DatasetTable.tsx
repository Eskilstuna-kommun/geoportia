import { TableColumn } from '@backstage/core-components';
import { Box, IconButton, Tooltip } from '@material-ui/core';
import LockIcon from '@material-ui/icons/Lock';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import React from 'react';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../translation';
import { DataTable } from '../DataTable';
import { DatasetEntry } from '../../data';
import { useMainGeoDatasetStyles } from './styles';
import { ShieldIcon, StatusBadge } from './indicators';

export type DatasetTableProps = {
  data: DatasetEntry[];
  pageSize: number;
  onSelectionChange: (rows: DatasetEntry[]) => void;
};

export const DatasetTable = ({
  data,
  pageSize,
  onSelectionChange,
}: DatasetTableProps) => {
  const classes = useMainGeoDatasetStyles();
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);

  const columns: TableColumn<DatasetEntry>[] = [
    {
      title: t('table.signatureStatus'),
      field: 'signaturstatus',
      render: row => <StatusBadge status={row.signaturstatus} />,
      width: '100px',
    },
    {
      title: t('table.title'),
      field: 'titel',
      render: row => (
        <Box className={classes.titleCell}>
          <LockIcon className={classes.lockIcon} />
          {row.titel}
        </Box>
      ),
      highlight: true,
    },
    {
      title: t('table.protectionClass'),
      field: 'skyddsklass',
      render: row => <ShieldIcon level={row.skyddsklass} />,
      width: '100px',
    },
    {
      title: t('table.summary'),
      field: 'sammanfattning',
    },
    {
      title: t('table.openData'),
      field: 'oppenData',
      render: row =>
        row.oppenData ? (
          <CheckIcon className={classes.openDataYes} />
        ) : (
          <CloseIcon className={classes.openDataNo} />
        ),
      width: '100px',
    },
    {
      title: '',
      field: 'actions',
      sorting: false,
      filtering: false,
      width: '56px',
      align: 'center',
      render: row => (
        <Tooltip title={t('table.moreOptions')}>
          <IconButton
            size="small"
            onClick={e => {
              e.stopPropagation();
              alert(`Options for: ${row.titel}`);
            }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  return (
    <DataTable<DatasetEntry>
      title=""
      columns={columns}
      data={data}
      options={{
        search: false,
        paging: true,
        pageSize: pageSize,
        sorting: true,
        padding: 'dense',
        selection: true,
      }}
      onSelectionChange={onSelectionChange}
    />
  );
};
