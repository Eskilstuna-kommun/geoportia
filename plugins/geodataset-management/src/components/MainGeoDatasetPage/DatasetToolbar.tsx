import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Tooltip,
} from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import FilterListIcon from '@material-ui/icons/FilterList';
import ViewColumnIcon from '@material-ui/icons/ViewColumn';
import AddIcon from '@material-ui/icons/Add';
import ViewHeadlineIcon from '@material-ui/icons/ViewHeadline';
import ViewStreamIcon from '@material-ui/icons/ViewStream';
import MenuIcon from '@mui/icons-material/Menu';
import React from 'react';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../translation';
import { useMainGeoDatasetStyles } from './styles';

export type RowDensity = 'compact' | 'standard' | 'comfortable';

export type DatasetToolbarProps = {
  searchText: string;
  onSearchChange: (value: string) => void;
  selectedView: string;
  onViewChange: (value: string) => void;
  rowDensity: RowDensity;
  onRowDensityChange: (value: RowDensity) => void;
};

export const DatasetToolbar = ({
  searchText,
  onSearchChange,
  selectedView,
  onViewChange,
  rowDensity,
  onRowDensityChange,
}: DatasetToolbarProps) => {
  const classes = useMainGeoDatasetStyles();
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);

  return (
    <Box className={classes.toolbar}>
      <Box className={classes.toolbarLeft}>
        <FormControl
          variant="outlined"
          size="small"
          className={classes.viewSelect}
        >
          <Select
            value={selectedView}
            onChange={e => onViewChange(e.target.value as string)}
          >
            <MenuItem value="standard">{t('views.standard')}</MenuItem>
            <MenuItem value="compact">{t('views.compact')}</MenuItem>
            <MenuItem value="detailed">{t('views.detailed')}</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box className={classes.toolbarRight}>
        <div className={classes.toolbarButton}>
          <TextField
            variant="outlined"
            size="small"
            placeholder={t('toolbar.search')}
            value={searchText}
            onChange={e => onSearchChange(e.target.value)}
            className={classes.searchField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button variant="outlined" startIcon={<FilterListIcon />}>
            {t('toolbar.filter')}
          </Button>
          <Button variant="outlined" startIcon={<ViewColumnIcon />}>
            {t('toolbar.columns')}
          </Button>
          <Button variant="outlined" startIcon={<AddIcon />}>
            {t('toolbar.addView')}
          </Button>{' '}
        </div>

        <div className={classes.toolbarIcon}>
          <div className={classes.densityGroup}>
            <Tooltip title={t('toolbar.compactRows')}>
              <IconButton
                size="small"
                className={`${classes.densityButton} ${
                  rowDensity === 'compact' ? classes.densityButtonActive : ''
                }`}
                onClick={() => onRowDensityChange('compact')}
              >
                <ViewHeadlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('toolbar.standardRows')}>
              <IconButton
                size="small"
                className={`${classes.densityButton} ${
                  rowDensity === 'standard' ? classes.densityButtonActive : ''
                }`}
                onClick={() => onRowDensityChange('standard')}
              >
                <MenuIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('toolbar.comfortableRows')}>
              <IconButton
                size="small"
                className={`${classes.densityButton} ${
                  rowDensity === 'comfortable' ? classes.densityButtonActive : ''
                }`}
                onClick={() => onRowDensityChange('comfortable')}
              >
                <ViewStreamIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </div>
        </div>
      </Box>
    </Box>
  );
};
