import React from 'react';
import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@material-ui/core';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../../translation';
import { ReviewItem } from '../../../data';

type Props = {
  items: ReviewItem[];
  selectedRows: string[];
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  onOpenDetail: (id: string) => void;
};

export const ReviewListTable = ({
  items,
  selectedRows,
  onToggleRow,
  onToggleAll,
  onOpenDetail,
}: Props) => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                checked={
                  items.length > 0 && selectedRows.length === items.length
                }
                indeterminate={
                  selectedRows.length > 0 && selectedRows.length < items.length
                }
                onChange={onToggleAll}
              />
            </TableCell>
            <TableCell>{t('reviewDialog.tableTitle')}</TableCell>
            <TableCell>{t('reviewDialog.tableSummary')}</TableCell>
            <TableCell>{t('reviewDialog.tableStatus')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map(row => (
            <TableRow
              key={row.id}
              hover
              style={{ cursor: 'pointer' }}
              onClick={() => onOpenDetail(row.id)}
            >
              <TableCell
                padding="checkbox"
                onClick={e => e.stopPropagation()}
              >
                <Checkbox
                  checked={selectedRows.includes(row.id)}
                  onChange={() => onToggleRow(row.id)}
                />
              </TableCell>
              <TableCell>
                <strong>{row.title}</strong>
              </TableCell>
              <TableCell>{row.summary}</TableCell>
              <TableCell>{t('reviewDialog.statusNotReviewed')}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
