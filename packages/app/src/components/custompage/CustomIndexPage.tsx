import {
  PageWithHeader,
  Content,
  ContentHeader,
  SupportButton,
  TableColumn,
  OverflowTooltip,
} from '@backstage/core-components';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import {
  CatalogTable,
  CatalogTableColumnsFunc,
  CatalogTableRow,
} from '@backstage/plugin-catalog';
import {
  EntityListProvider,
  CatalogFilterLayout,
  EntityKindPicker,
} from '@backstage/plugin-catalog-react';
import React, { useState } from 'react';
import { useGeoportiaOpenStyles } from '../../theme/geoportiaopen';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Tooltip from '@mui/material/Tooltip';
import {
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
} from '@material-ui/core';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';

import { EntityBooleanValuePicker } from './EntityBooleanValuePicker';

export const CustomIndexPage = ({ kind }: { kind: string }) => {
  const orgName =
    useApi(configApiRef).getOptionalString('organization.name') ?? 'Backstage';

  const geoportiaOpenStyles = useGeoportiaOpenStyles();

  const [columnOptionAnchorEl, setColumnOptionAnchorEl] =
    React.useState<null | HTMLElement>(null);
  const columnMenuOpen = Boolean(columnOptionAnchorEl);
  const handleColumnButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    setColumnOptionAnchorEl(event.currentTarget);
  };
  const handleColumnMenuClose = () => {
    setColumnOptionAnchorEl(null);
  };

  const [filterAnchorEl, setFilterAnchorEl] =
    React.useState<null | HTMLElement>(null);
  const filterMenuOpen = Boolean(filterAnchorEl);
  const handleFilterButtonClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };
  const handleFilterMenuClose = () => {
    setFilterAnchorEl(null);
  };

  const columnOptions = [
    { key: 'Name', label: 'Name', binary: false },
    { key: 'System', label: 'System', binary: false },
    { key: 'Owner', label: 'Owner', binary: false },
    { key: 'Type', label: 'Type', binary: false },
    { key: 'Lifecycle', label: 'Lifecycle', binary: false },
    { key: 'Description', label: 'Description', binary: false },
    { key: 'Tags', label: 'Tags', binary: false },
    { key: 'evenName', label: 'Even', binary: true },
    { key: 'longName', label: 'Long', binary: true },
  ];

  const [filteredColumns, setFilteredColumns] = useState<
    Record<string, string>
  >(
    columnOptions
      .filter(option => option.binary === true)
      .reduce((columns, option) => {
        columns[option.key] = 'none';
        return columns;
      }, {} as Record<string, string>),
  );

  const handleFilterChange = (column: string, value: string) => {
    setFilteredColumns(prevColumns => ({
      ...prevColumns,
      [column]: value,
    }));
  };

  // Initially all columns are selected to be shown
  const [selectedColumns, setSelectedColumns] = useState<
    Record<string, boolean>
  >(
    columnOptions.reduce((columns, option) => {
      columns[option.key] = true;
      return columns;
    }, {} as Record<string, boolean>),
  );

  // Switches the selection state of a column between shown and not shown
  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prevColumns => ({
      ...prevColumns,
      [column]: !prevColumns[column],
    }));
  };

  const filterOptions = [
    { label: 'Do not filter', value: 'none' },
    { label: 'Filter on true', value: 'true' },
    { label: 'Filter on false', value: 'false' },
  ];

  // Adds a column that shows if the entity name has an even number of characters; for demo purposes
  const createEntityNameIsEvenColumn = (): TableColumn<CatalogTableRow> => ({
    title: 'Even',
    render: ({ entity }) => (
      <OverflowTooltip
        // @ts-ignore
        text={entity.metadata.evenName}
        placement="bottom-start"
      />
    ),
  });

  // Adds a column that shows if the entity name is longer than 5 letters; for demo purposes
  const createEntityNameIsLongColumn = (): TableColumn<CatalogTableRow> => ({
    title: 'Long',
    render: ({ entity }) => (
      <OverflowTooltip
        // @ts-ignore
        text={entity.metadata.longName}
        placement="bottom-start"
      />
    ),
  });

  // Restricts the column shown to the ones selected in the column menu
  const getColumns: CatalogTableColumnsFunc = entityListContext => {
    if (entityListContext.filters.kind?.value === kind) {
      return [
        ...CatalogTable.defaultColumnsFunc(entityListContext).filter(
          column => selectedColumns[column.title as string],
        ),
        createEntityNameIsEvenColumn(),
        createEntityNameIsLongColumn(),
      ];
    }

    return CatalogTable.defaultColumnsFunc(entityListContext);
  };

  return (
    <PageWithHeader title={orgName} themeId="home">
      <Content>
        <ContentHeader title="">
          <SupportButton>All your software catalog entities</SupportButton>
        </ContentHeader>
        <div className={geoportiaOpenStyles.catalogFilterContainer}>
          <div className={geoportiaOpenStyles.catalogMenuContainer}>
            <div className={geoportiaOpenStyles.filterMenu}>
              <div className={geoportiaOpenStyles.filterMenuDropdownContainer}>
                <React.Fragment>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <Tooltip title="Select filters to apply">
                      <Button
                        className={geoportiaOpenStyles.filterMenuButton}
                        onClick={handleFilterButtonClick}
                        size="small"
                        aria-controls={
                          filterMenuOpen ? 'account-menu' : undefined
                        }
                        aria-haspopup="true"
                        aria-expanded={filterMenuOpen ? 'true' : undefined}
                      >
                        <FilterAltOutlinedIcon />
                        Filter
                      </Button>
                    </Tooltip>
                  </Box>
                  <Menu
                    anchorEl={filterAnchorEl}
                    className={geoportiaOpenStyles.filterMenuDropdown}
                    id="filter-menu"
                    open={filterMenuOpen}
                    onClose={handleFilterMenuClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  >
                    <div
                      className={`${geoportiaOpenStyles.flexBoxColumn} ${geoportiaOpenStyles.filterMenuDropdown}`}
                    >
                      {columnOptions
                        .filter(option => option.binary)
                        .map(filterOption => (
                          <FormControl
                            variant="filled"
                            className={
                              geoportiaOpenStyles.filterMenuDropdownForm
                            }
                          >
                            <InputLabel
                              className={
                                geoportiaOpenStyles.filterMenuDropdownLabel
                              }
                              id={`filtermenu-dropdown-label-${filterOption.key}`}
                            >
                              {filterOption.label}
                            </InputLabel>
                            <Select
                              className={geoportiaOpenStyles.dropdownMenu}
                              labelId="filtermenu-dropdown-select-label"
                              id="filtermenu-dropdown-select"
                              value={filteredColumns[filterOption.key]}
                              label={filterOption.label}
                              onChange={e =>
                                handleFilterChange(
                                  filterOption.key,
                                  e.target.value as string,
                                )
                              }
                            >
                              {filterOptions.map(option => (
                                <MenuItem
                                  key={`${option.label}_${option.value}`}
                                  value={option.value}
                                >
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ))}
                    </div>
                  </Menu>
                </React.Fragment>
              </div>
            </div>

            <div className={geoportiaOpenStyles.columnMenu}>
              <div className={geoportiaOpenStyles.columnMenuDropdownContainer}>
                <React.Fragment>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <Tooltip title="Select columns to display">
                      <Button
                        className={geoportiaOpenStyles.columnMenuButton}
                        onClick={handleColumnButtonClick}
                        size="small"
                        aria-controls={
                          columnMenuOpen ? 'account-menu' : undefined
                        }
                        aria-haspopup="true"
                        aria-expanded={columnMenuOpen ? 'true' : undefined}
                      >
                        <TableRowsOutlinedIcon />
                        Columns
                      </Button>
                    </Tooltip>
                  </Box>
                  <Menu
                    anchorEl={columnOptionAnchorEl}
                    id="column-menu"
                    open={columnMenuOpen}
                    onClose={handleColumnMenuClose}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  >
                    <FormGroup
                      className={geoportiaOpenStyles.columnMenuDropdown}
                    >
                      {columnOptions.map(option => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              onChange={() => handleColumnToggle(option.key)}
                              checked={selectedColumns[option.key as string]}
                            />
                          }
                          label={option.label}
                        />
                      ))}
                    </FormGroup>
                  </Menu>
                </React.Fragment>
              </div>
            </div>
          </div>
        </div>

        <EntityListProvider pagination>
          <CatalogFilterLayout>
            <div
              className={geoportiaOpenStyles.catalogFilterContainer}
              hidden={true}
            >
              <CatalogFilterLayout.Filters>
                <EntityBooleanValuePicker
                  columnOptions={columnOptions
                    .filter(columnOption => columnOption.binary)
                    .map(columnOption => columnOption.key)}
                  filteredColumns={filteredColumns}
                />
                <EntityKindPicker initialFilter={kind} />
              </CatalogFilterLayout.Filters>
            </div>
            <CatalogFilterLayout.Content>
              <CatalogTable columns={getColumns} />
            </CatalogFilterLayout.Content>
          </CatalogFilterLayout>
        </EntityListProvider>
      </Content>
    </PageWithHeader>
  );
};
