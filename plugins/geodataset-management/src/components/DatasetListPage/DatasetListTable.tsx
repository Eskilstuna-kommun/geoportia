import { TableColumn } from '@backstage/core-components';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@material-ui/core';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import DeleteIcon from '@material-ui/icons/Delete';
import RestoreIcon from '@material-ui/icons/Restore';
import React, { useState } from 'react';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../translation';
import { DataTable } from '../DataTable';
import { useMainGeoDatasetStyles } from '../MainGeoDatasetPage/styles';
import { RowDensity } from '../MainGeoDatasetPage/DatasetToolbar';

export type DatasetRow = {
  id: string;
  name: string;
  description: string;
  database: string;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
};

export type DatasetListTableProps = {
  data: DatasetRow[];
  pageSize: number;
  rowDensity?: RowDensity;
  visibleColumns?: string[];
  canManage?: boolean;
  onSelectionChange?: (rows: DatasetRow[]) => void;
  onRowClick?: (row: DatasetRow) => void;
  onDelete: (row: DatasetRow) => void;
  onRestore: (row: DatasetRow) => void;
};

const formatDate = (iso: string): string => {
  if (!iso) return '';
  return iso.length >= 10 ? iso.slice(0, 10) : iso;
};

export const DatasetListTable = ({
  data,
  pageSize,
  rowDensity = 'comfortable',
  visibleColumns,
  canManage = true,
  onSelectionChange,
  onRowClick,
  onDelete,
  onRestore,
}: DatasetListTableProps) => {
  const classes = useMainGeoDatasetStyles();
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuRow, setMenuRow] = useState<DatasetRow | null>(null);

  const openMenu = (
    event: React.MouseEvent<HTMLElement>,
    row: DatasetRow,
  ) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuRow(row);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  const allColumns: TableColumn<DatasetRow>[] = [
    {
      title: t('datasetList.columns.name'),
      field: 'name',
      highlight: true,
    },
    {
      title: t('datasetList.columns.description'),
      field: 'description',
    },
    {
      title: t('datasetList.columns.database'),
      field: 'database',
      width: '160px',
    },
    {
      title: t('datasetList.columns.createdAt'),
      field: 'createdAt',
      width: '120px',
      render: row => formatDate(row.createdAt),
    },
    {
      title: t('datasetList.columns.updatedAt'),
      field: 'updatedAt',
      width: '120px',
      render: row => formatDate(row.updatedAt),
    },
    {
      title: '',
      field: 'actions',
      sorting: false,
      filtering: false,
      width: '56px',
      align: 'center',
      render: row =>
        canManage ? (
          <Tooltip title={t('table.moreOptions')}>
            <IconButton size="small" onClick={e => openMenu(e, row)}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null,
    },
  ];

  const columns = visibleColumns
    ? allColumns.filter(
        c => c.field === 'actions' || visibleColumns.includes(String(c.field)),
      )
    : allColumns;

  return (
    <div className={classes[`density_${rowDensity}` as const]}>
      <DataTable<DatasetRow>
        title=""
        columns={columns}
        data={data}
        options={{
          search: false,
          paging: true,
          pageSize,
          sorting: true,
          padding: rowDensity === 'compact' ? 'dense' : 'default',
          selection: true,
        }}
        onSelectionChange={onSelectionChange}
        onRowClick={onRowClick}
      />
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        onClick={e => e.stopPropagation()}
      >
        {canManage &&
          (menuRow?.isDeleted ? (
            <MenuItem
              onClick={() => {
                if (menuRow) onRestore(menuRow);
                closeMenu();
              }}
            >
              <ListItemIcon>
                <RestoreIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t('datasetList.actions.restore')} />
            </MenuItem>
          ) : (
            <MenuItem
              onClick={() => {
                if (menuRow) onDelete(menuRow);
                closeMenu();
              }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t('datasetList.actions.delete')} />
            </MenuItem>
          ))}
      </Menu>
    </div>
  );
};
