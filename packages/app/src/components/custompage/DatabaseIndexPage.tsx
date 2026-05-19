import {
  PageWithHeader,
  Content,
  ContentHeader,
  SupportButton,
  TableColumn,
  OverflowTooltip,
} from '@backstage/core-components';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import {
  CatalogTable,
  CatalogTableColumnsFunc,
  CatalogTableRow,
} from '@backstage/plugin-catalog';
import {
  EntityListProvider,
  CatalogFilterLayout,
  EntityKindPicker,
  EntityTypePicker,
} from '@backstage/plugin-catalog-react';
import React from 'react';
import { useGeoportiaOpenStyles } from '../../theme/geoportiaopen';
import { geoportiaTranslationRef } from '../../translations';

export const DatabaseIndexPage = () => {
  const orgName =
    useApi(configApiRef).getOptionalString('organization.name') ?? 'Backstage';

  const { t } = useTranslationRef(geoportiaTranslationRef);
  const geoportiaOpenStyles = useGeoportiaOpenStyles();

  // Custom columns for database resources
  const createDatabaseTypeColumn = (): TableColumn<CatalogTableRow> => ({
    title: 'Typ',
    field: 'entity.spec.type',
    render: ({ entity }) => (
      <OverflowTooltip
        text={(entity.spec as any)?.type || '-'}
        placement="bottom-start"
      />
    ),
  });

  const createDatabaseSystemColumn = (): TableColumn<CatalogTableRow> => ({
    title: 'System',
    field: 'entity.spec.system',
    render: ({ entity }) => (
      <OverflowTooltip
        text={(entity.spec as any)?.system || '-'}
        placement="bottom-start"
      />
    ),
  });

  // Custom columns for database table
  const getColumns: CatalogTableColumnsFunc = entityListContext => {
    const defaultColumns = CatalogTable.defaultColumnsFunc(entityListContext);
    // Filter out columns we don't need and add custom ones
    return [
      ...defaultColumns.filter(col => 
        ['Name', 'Owner', 'Description', 'Tags'].includes(col.title as string)
      ),
      createDatabaseTypeColumn(),
      createDatabaseSystemColumn(),
    ];
  };

  return (
    <PageWithHeader title={orgName} themeId="home">
      <Content>
        <ContentHeader title="Databaser">
          <SupportButton>{t('customIndexPage.supportButtonContent')}</SupportButton>
        </ContentHeader>

        <EntityListProvider pagination>
          <CatalogFilterLayout>
            <div
              className={geoportiaOpenStyles.catalogFilterContainer}
              hidden={true}
            >
              <CatalogFilterLayout.Filters>
                <EntityKindPicker initialFilter="resource" hidden />
                <EntityTypePicker initialFilter="database" hidden />
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
