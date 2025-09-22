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

export const CustomIndexPage = ({ kind }: { kind: string }) => {
  const orgName =
    useApi(configApiRef).getOptionalString('organization.name') ?? 'Backstage';

  const columnOptions = [
    { key: 'Name', label: 'Name' },
    { key: 'System', label: 'System' },
    { key: 'Owner', label: 'Owner' },
    { key: 'Type', label: 'Type' },
    { key: 'Lifecycle', label: 'Lifecycle' },
    { key: 'Description', label: 'Description' },
    { key: 'Tags', label: 'Tags' },
  ];

  const [selectedColumns, setSelectedColumns] = useState<
    Record<string, boolean>
  >(
    columnOptions.reduce((columns, option) => {
      columns[option.key] = true;
      return columns;
    }, {} as Record<string, boolean>),
  );

  const handleColumnToggle = (column: string) => {
    setSelectedColumns(prevColumns => ({
      ...prevColumns,
      [column]: !prevColumns[column],
    }));
  };

  const getColumns: CatalogTableColumnsFunc = entityListContext => {
    if (entityListContext.filters.kind?.value === kind) {
      return CatalogTable.defaultColumnsFunc(entityListContext).filter(
        column => selectedColumns[column.title as string],
      );
    }

    return CatalogTable.defaultColumnsFunc(entityListContext);
  };

  const [dropdownVisible, setDropdownVisible] = useState(false);

  return (
    <PageWithHeader title={orgName} themeId="home">
      <Content>
        <ContentHeader title="">
          <SupportButton>All your software catalog entities</SupportButton>
        </ContentHeader>

        <div
          className="column-menu"
        >
          <button onClick={() => setDropdownVisible(!dropdownVisible)}>
            Columns
          </button>
          {dropdownVisible && (
            <div className="column-menu-dropdown"
            style={{
                display: "grid",
                position: "absolute",
                backgroundColor: "#f9f9f9",
                zIndex: 1,
            }}>
              {columnOptions.map(option => (
                <label key={option.key}>
                  <input
                    type="checkbox"
                    checked={selectedColumns[option.key]}
                    onChange={() => handleColumnToggle(option.key)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <EntityListProvider pagination>
          <CatalogFilterLayout>
            <div className="catalog-filter-container" hidden={true}>
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
