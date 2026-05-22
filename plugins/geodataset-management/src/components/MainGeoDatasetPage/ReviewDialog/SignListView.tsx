import React from 'react';
import {
  Box,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../../translation';
import { ReviewItem } from '../../../data';

type Props = {
  items: ReviewItem[];
  selectedRows: string[];
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
};

export const SignListView = ({
  items,
  selectedRows,
  onToggleRow,
  onToggleAll,
}: Props) => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  return (
    <Box>
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
                    selectedRows.length > 0 &&
                    selectedRows.length < items.length
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
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="textSecondary">
                    {t('reviewDialog.nothingToSign')}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map(row => (
                <TableRow key={row.id} hover>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedRows.includes(row.id)}
                      onChange={() => onToggleRow(row.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <strong>{row.title}</strong>
                  </TableCell>
                  <TableCell>{row.summary}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" style={{ gap: 4 }}>
                      {t('reviewDialog.statusReviewed')}
                      <CheckIcon
                        fontSize="small"
                        style={{ color: 'green' }}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
