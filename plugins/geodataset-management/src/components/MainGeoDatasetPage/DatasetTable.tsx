import { TableColumn } from '@backstage/core-components';
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
} from '@material-ui/core';
import LockIcon from '@material-ui/icons/Lock';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import RestoreIcon from '@material-ui/icons/Restore';
import React, { useState } from 'react';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../translation';
import { DataTable } from '../DataTable';
import { DatasetEntry } from '../../data';
import { useMainGeoDatasetStyles } from './styles';
import { ShieldIcon, StatusBadge } from './indicators';
import { RowDensity } from './DatasetToolbar';

export type DatasetTableProps = {
  data: DatasetEntry[];
  pageSize: number;
  rowDensity?: RowDensity;
  /** Subset of column field-names to render (excluding the action menu, which is always shown). */
  visibleColumns?: string[];
  /** When false, the row menu hides edit/delete/restore actions. */
  canManage?: boolean;
  onSelectionChange: (rows: DatasetEntry[]) => void;
  onRowClick?: (row: DatasetEntry) => void;
  onEdit?: (row: DatasetEntry) => void;
  onDelete?: (row: DatasetEntry) => void;
  onRestore?: (row: DatasetEntry) => void;
};

export const DatasetTable = ({
  data,
  pageSize,
  rowDensity = 'comfortable',
  visibleColumns,
  canManage = true,
  onSelectionChange,
  onRowClick,
  onEdit,
  onDelete,
  onRestore,
}: DatasetTableProps) => {
  const classes = useMainGeoDatasetStyles();
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuRow, setMenuRow] = useState<DatasetEntry | null>(null);

  const openMenu = (
    event: React.MouseEvent<HTMLElement>,
    row: DatasetEntry,
  ) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuRow(row);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  const allColumns: TableColumn<DatasetEntry>[] = [
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
      <DataTable<DatasetEntry>
        title=""
        columns={columns}
        data={data}
        options={{
          search: false,
          paging: true,
          pageSize: pageSize,
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
        {!menuRow?.isDeleted && canManage && (
          <MenuItem
            onClick={() => {
              if (menuRow) onEdit?.(menuRow);
              closeMenu();
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={t('table.edit')} />
          </MenuItem>
        )}
        {canManage &&
          (menuRow?.isDeleted ? (
            <MenuItem
              onClick={() => {
                if (menuRow) onRestore?.(menuRow);
                closeMenu();
              }}
            >
              <ListItemIcon>
                <RestoreIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t('table.restore')} />
            </MenuItem>
          ) : (
            <MenuItem
              onClick={() => {
                if (menuRow) onDelete?.(menuRow);
                closeMenu();
              }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={t('table.delete')} />
            </MenuItem>
          ))}
      </Menu>
    </div>
  );
};
