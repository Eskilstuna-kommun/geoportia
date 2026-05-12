import {
  Box,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
  Switch,
  Typography,
} from '@material-ui/core';
import React from 'react';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../translation';
import { useMainGeoDatasetStyles } from './styles';

export type DatasetPaginationInfoProps = {
  pageSize: number;
  onPageSizeChange: (value: number) => void;
  totalRows: number;
  selectedCount: number;
  showDeleted: boolean;
  onShowDeletedChange: (value: boolean) => void;
};

export const DatasetPaginationInfo = ({
  pageSize,
  onPageSizeChange,
  totalRows,
  selectedCount,
  showDeleted,
  onShowDeletedChange,
}: DatasetPaginationInfoProps) => {
  const classes = useMainGeoDatasetStyles();
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);

  return (
    <Box className={classes.paginationInfo}>
      <Box display="flex" alignItems="center" style={{ gap: 8 }}>
        <Typography variant="body2">{t('pagination.show')}</Typography>
        <FormControl variant="outlined" size="small">
          <Select
            value={pageSize}
            onChange={e => onPageSizeChange(e.target.value as number)}
            style={{ minWidth: 70 }}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="body2">
          {t('pagination.rowsOf')} {totalRows}
        </Typography>
        {selectedCount > 0 && (
          <Typography variant="body2" color="primary">
            ({selectedCount} selected)
          </Typography>
        )}
      </Box>
      <FormControlLabel
        control={
          <Switch
            checked={showDeleted}
            onChange={e => onShowDeletedChange(e.target.checked)}
            color="primary"
          />
        }
        label={t('pagination.showDeleted')}
      />
    </Box>
  );
};
