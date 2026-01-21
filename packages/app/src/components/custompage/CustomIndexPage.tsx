import {
  PageWithHeader,
  Content,
  ContentHeader,
  SupportButton,
} from '@backstage/core-components';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import {
  CatalogTable,
  CatalogTableColumnsFunc,
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
import { Button, Checkbox, FormControlLabel, FormGroup } from '@material-ui/core';

export const CustomIndexPage = ({ kind }: { kind: string }) => {
  const orgName =
    useApi(configApiRef).getOptionalString('organization.name') ?? 'Backstage';

  const geoportiaOpenStyles = useGeoportiaOpenStyles();

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const columnMenuOpen = Boolean(anchorEl);
    const handleColumnButtonClick = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
    };
    const handleColumnMenuClose = () => {
      setAnchorEl(null);
    };

  const columnOptions = [
    { key: 'Name', label: 'Name' },
    { key: 'System', label: 'System' },
    { key: 'Owner', label: 'Owner' },
    { key: 'Type', label: 'Type' },
    { key: 'Lifecycle', label: 'Lifecycle' },
    { key: 'Description', label: 'Description' },
    { key: 'Tags', label: 'Tags' },
  ];

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

  // Restricts the column shown to the ones selected in the column menu
  const getColumns: CatalogTableColumnsFunc = entityListContext => {
    if (entityListContext.filters.kind?.value === kind) {
      return CatalogTable.defaultColumnsFunc(entityListContext).filter(
        column => selectedColumns[column.title as string],
      );
    }

    return CatalogTable.defaultColumnsFunc(entityListContext);
  };

  return (
    <PageWithHeader title={orgName} themeId="home">
      <Content>
        <ContentHeader title="">
          <SupportButton>All your software catalog entities</SupportButton>
        </ContentHeader>
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
                    aria-controls={columnMenuOpen ? 'account-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={columnMenuOpen ? 'true' : undefined}
                  >
                    Columns
                  </Button>
                </Tooltip>
              </Box>
              <Menu
                anchorEl={anchorEl}
                id="account-menu"
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
        <EntityListProvider pagination>
          <CatalogFilterLayout>
            <div
              className={geoportiaOpenStyles.catalogFilterContainer}
              hidden={true}
            >
              <CatalogFilterLayout.Filters>
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
