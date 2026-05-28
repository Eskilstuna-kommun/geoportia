import { Table, TableColumn, TableProps } from '@backstage/core-components';
import { makeStyles } from '@material-ui/core';
import React from 'react';

const useStyles = makeStyles({
  tableWrapper: {
    '& [class*="MuiTableCell-paddingNone"]': {
      width: '48px !important',
      minWidth: '48px !important',
      maxWidth: '48px !important',
      textAlign: 'center !important' as any,
      verticalAlign: 'middle !important' as any,
      padding: '0 !important',
    },
    '& [class*="MuiTableCell-paddingNone"] > [class*="MuiCheckbox-root"], & [class*="MuiTableCell-paddingNone"] > span[class*="MuiButtonBase-root"]':
      {
        padding: '4px !important',
        marginLeft: '8px !important',
        display: 'inline-flex !important' as any,
      },
    '& [class*="MuiTableCell-root"]': {
      verticalAlign: 'middle',
    },
    '& [class*="MuiIconButton-root"]': {
      padding: 8,
    },
  },
});

export type DataTableProps<T extends object> = {
  title: string;
  columns: TableColumn<T>[];
  data: T[];
  actions?: TableProps<T>['actions'];
  onSelectionChange?: (selectedRows: T[]) => void;
  onRowClick?: (row: T) => void;
  options?: {
    search?: boolean;
    paging?: boolean;
    pageSize?: number;
    sorting?: boolean;
    actionsColumnIndex?: number;
    padding?: 'default' | 'dense';
    selection?: boolean;
    rowStyle?: React.CSSProperties;
  };
};

const defaultOptions = {
  search: true,
  paging: true,
  pageSize: 10,
  sorting: true,
  actionsColumnIndex: -1,
  padding: 'dense' as const,
  selection: false,
};

export const DataTable = <T extends object>({
  title,
  columns,
  data,
  actions,
  options,
  onSelectionChange,
  onRowClick,
}: DataTableProps<T>) => {
  const classes = useStyles();
  const mergedOptions = { ...defaultOptions, ...options };
  const handleRowSelected = onSelectionChange
    ? (rows: T[], _rowData?: T) => {
        onSelectionChange(rows);
      }
    : undefined;

  return (
    <div className={classes.tableWrapper}>
      <Table<T>
        key={`pgsz-${mergedOptions.pageSize}`}
        title={title}
        options={mergedOptions}
        columns={columns}
        data={data}
        actions={actions}
        onRowClick={
          onRowClick
            ? (_event, rowData) => {
                if (rowData) onRowClick(rowData);
              }
            : undefined
        }
        onRowSelected={handleRowSelected as TableProps<T>['onRowSelected']}
      />
    </div>
  );
};
