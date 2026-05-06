import React from 'react';
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
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';

type ColumnOption = { key: string; label: string; binary: boolean };

type Props = {
  columnOptions: ColumnOption[];
  filteredColumns: Record<string, string>;
  selectedColumns: Record<string, boolean>;
  geoportiaOpenStyles: ReturnType<
    typeof import('@internal/geoportia-ui').useGeoportiaOpenStyles
  >;
  onFilterChange: (column: string, value: string) => void;
  onColumnToggle: (column: string) => void;
  onOpenNewViewDialog: () => void;
};

const filterOptions = [
  { label: 'Do not filter', value: 'none' },
  { label: 'Filter on true', value: 'true' },
  { label: 'Filter on false', value: 'false' },
];

export const FilterBar = ({
  columnOptions,
  filteredColumns,
  selectedColumns,
  geoportiaOpenStyles,
  onFilterChange,
  onColumnToggle,
  onOpenNewViewDialog,
}: Props) => {
  const [columnOptionAnchorEl, setColumnOptionAnchorEl] =
    React.useState<null | HTMLElement>(null);
  const columnMenuOpen = Boolean(columnOptionAnchorEl);

  const [filterAnchorEl, setFilterAnchorEl] =
    React.useState<null | HTMLElement>(null);
  const filterMenuOpen = Boolean(filterAnchorEl);

  const handleFilterButtonClick = (
    event: React.MouseEvent<HTMLElement>,
  ): void => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterMenuClose = (): void => {
    setFilterAnchorEl(null);
  };

  const handleFilterChange = (column: string, value: string): void => {
    onFilterChange(column, value);
  };

  const handleColumnButtonClick = (
    event: React.MouseEvent<HTMLElement>,
  ): void => {
    setColumnOptionAnchorEl(event.currentTarget);
  };

  const handleColumnMenuClose = (): void => {
    setColumnOptionAnchorEl(null);
  };

  const handleColumnToggle = (column: string): void => {
    onColumnToggle(column);
  };

  const handleOpenNewViewDialog = (): void => {
    onOpenNewViewDialog();
  };

  return (
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
                    aria-controls={filterMenuOpen ? 'account-menu' : undefined}
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
                        className={geoportiaOpenStyles.filterMenuDropdownForm}
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

        <div className={geoportiaOpenStyles.filterMenu}>
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
                    className={geoportiaOpenStyles.filterMenuButton}
                    onClick={handleColumnButtonClick}
                    size="small"
                    aria-controls={columnMenuOpen ? 'account-menu' : undefined}
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
                <FormGroup className={geoportiaOpenStyles.columnMenuDropdown}>
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
                <Tooltip title="Add new view">
                  <Button
                    className={geoportiaOpenStyles.filterMenuButton}
                    onClick={handleOpenNewViewDialog}
                    size="small"
                    aria-controls={filterMenuOpen ? 'account-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={filterMenuOpen ? 'true' : undefined}
                  >
                    <AddOutlinedIcon />
                    Lägg till vy
                  </Button>
                </Tooltip>
              </Box>
            </React.Fragment>
          </div>
        </div>
      </div>
    </div>
  );
};
