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
import { useGeoportiaOpenStyles } from '@internal/geoportia-ui';
import { EntityBooleanValuePicker } from './EntityBooleanValuePicker';
import { FilterBar } from './FilterBar';
import { ViewDialog, ViewDialogProps } from './ViewDialog';
import { tableFilterOptions } from '../../utils/columnOptions';
import { createView } from '../DbFetchComponent/DbFetchComponent';

export const CustomTable = ({ kind }: { kind: string }) => {
  const orgName =
    useApi(configApiRef).getOptionalString('organization.name') ?? 'Backstage';

  const geoportiaOpenStyles = useGeoportiaOpenStyles();

  const [isNewViewDialogOpen, setIsNewViewDialogOpen] = useState(false);

  const [filteredColumns, setFilteredColumns] = useState<
    Record<string, string>
  >(
    tableFilterOptions()
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
    tableFilterOptions().reduce((columns, option) => {
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

  // Open dialog to add new postgreSQL view
  const handleOpenNewViewDialog = () => {
    setIsNewViewDialogOpen(true);
  };
  // Close dialog to add new postgreSQL view
  const handleCloseNewViewDialog = () => {
    setIsNewViewDialogOpen(false);
  };

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

  const handleAddView = async (view: ViewDialogProps) => {
    const tableDefinitions = [];

    for (const table of view.Table) {
      const tableColumns = view.Columns.filter(col =>
        col.startsWith(`${table}.`),
      );

      const tableDefinition = {
        name: table,
        columns: tableColumns.map(col => col.split('.').slice(1).join('.')),
      };

      tableDefinitions.push(tableDefinition);
    }

    await createView(view.viewName, "public", tableDefinitions);
  };

  return (
    <>
      <PageWithHeader title={orgName} themeId="home">
        <Content>
          <ContentHeader title="">
            <SupportButton>All your software catalog entities</SupportButton>
          </ContentHeader>
          <div className={geoportiaOpenStyles.catalogFilterContainer}>
            <div className={geoportiaOpenStyles.catalogMenuContainer}>
              <FilterBar
                columnOptions={tableFilterOptions()}
                filteredColumns={filteredColumns}
                selectedColumns={selectedColumns}
                geoportiaOpenStyles={geoportiaOpenStyles}
                onFilterChange={handleFilterChange}
                onColumnToggle={handleColumnToggle}
                onOpenNewViewDialog={handleOpenNewViewDialog}
              />
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
                    columnOptions={tableFilterOptions()
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

      <ViewDialog
        geoportiaOpenStyles={geoportiaOpenStyles}
        open={isNewViewDialogOpen}
        onClose={handleCloseNewViewDialog}
        onSubmit={handleAddView}
      />
    </>
  );
};
