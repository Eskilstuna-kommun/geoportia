import {
    PageWithHeader,
    Content,
    ContentHeader,
    SupportButton,
  } from '@backstage/core-components';
  import { useApi, configApiRef } from '@backstage/core-plugin-api';
  import { CatalogTable } from '@backstage/plugin-catalog';
  import {
    EntityListProvider,
    CatalogFilterLayout,
    EntityKindPicker,
    EntityLifecyclePicker,
    EntityNamespacePicker,
    EntityOwnerPicker,
    EntityProcessingStatusPicker,
    EntityTagPicker,
    EntityTypePicker,
    UserListPicker,
  } from '@backstage/plugin-catalog-react';
  import React from 'react';
  
  export const CustomFMEWorkspacePage = () => {
    const orgName =
      useApi(configApiRef).getOptionalString('organization.name') ?? 'Backstage';
  
    return (
      <PageWithHeader title={orgName} themeId="home">
        <Content>
          <ContentHeader title="">
            <SupportButton>All your software catalog entities</SupportButton>
          </ContentHeader>
          <EntityListProvider pagination>
            <CatalogFilterLayout>
              <CatalogFilterLayout.Filters>
                <EntityKindPicker initialFilter='fmeworkspace' hidden />
                <EntityTypePicker />
                <UserListPicker />
                <EntityOwnerPicker />
                <EntityLifecyclePicker />
                <EntityTagPicker />
                <EntityProcessingStatusPicker />
                <EntityNamespacePicker />
              </CatalogFilterLayout.Filters>
              <CatalogFilterLayout.Content>
                <CatalogTable />
              </CatalogFilterLayout.Content>
            </CatalogFilterLayout>
          </EntityListProvider>
        </Content>
      </PageWithHeader>
    );
  };