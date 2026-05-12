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
import ViewListIcon from '@material-ui/icons/ViewList';
import ViewModuleIcon from '@material-ui/icons/ViewModule';
import React from 'react';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../translation';
import { useMainGeoDatasetStyles } from './styles';

export type DatasetToolbarProps = {
  searchText: string;
  onSearchChange: (value: string) => void;
  selectedView: string;
  onViewChange: (value: string) => void;
};

export const DatasetToolbar = ({
  searchText,
  onSearchChange,
  selectedView,
  onViewChange,
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
        </Button>
        <Tooltip title={t('toolbar.listView')}>
          <IconButton size="small">
            <ViewListIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('toolbar.gridView')}>
          <IconButton size="small">
            <ViewModuleIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
