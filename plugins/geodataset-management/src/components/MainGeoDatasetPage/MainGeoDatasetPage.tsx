import { Content, PageWithHeader } from '@backstage/core-components';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { Box, Tab, Tabs, Typography } from '@material-ui/core';
import React, { useState } from 'react';
import { geodatasetManagementTranslationRef } from '../../translation';
import { sampleDatasetEntries, DatasetEntry } from '../../data';
import { useMainGeoDatasetStyles } from './styles';
import { DatasetToolbar } from './DatasetToolbar';
import { DatasetPaginationInfo } from './DatasetPaginationInfo';
import { DatasetTable } from './DatasetTable';

const TOTAL_ROWS = 1162;

export const MainGeoDatasetPage = () => {
  const classes = useMainGeoDatasetStyles();
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  const orgName =
    useApi(configApiRef).getOptionalString('organization.name') ?? 'Backstage';

  const [activeTab, setActiveTab] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [selectedView, setSelectedView] = useState('standard');
  const [showDeleted, setShowDeleted] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRows, setSelectedRows] = useState<DatasetEntry[]>([]);

  const handleTabChange = (_event: React.ChangeEvent<{}>, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <PageWithHeader title={orgName} themeId="home">
      <Content>
        <Box className={classes.tabsContainer}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            className={classes.tabs}
            classes={{ indicator: classes.indicator }}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label={t('tabs.dataOwner')} className={classes.tab} />
            <Tab label={t('tabs.contactPerson')} className={classes.tab} />
            <Tab label={t('tabs.myProposals')} className={classes.tab} />
            <Tab
              label={t('tabs.manageActiveProposals')}
              className={classes.tab}
            />
            <Tab
              label={t('tabs.managementAgreement')}
              className={classes.tab}
            />
          </Tabs>
        </Box>

        <Box>
          {activeTab === 0 && (
            <>
              <Typography variant="h5" className={classes.pageTitle}>
                {t('pageTitle.dataOwner')}
              </Typography>

              <DatasetToolbar
                searchText={searchText}
                onSearchChange={setSearchText}
                selectedView={selectedView}
                onViewChange={setSelectedView}
              />

              <DatasetPaginationInfo
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                totalRows={TOTAL_ROWS}
                selectedCount={selectedRows.length}
                showDeleted={showDeleted}
                onShowDeletedChange={setShowDeleted}
              />

              <DatasetTable
                data={sampleDatasetEntries}
                pageSize={pageSize}
                onSelectionChange={setSelectedRows}
              />
            </>
          )}
          {activeTab === 1 && <div>{t('content.contactPerson')}</div>}
          {activeTab === 2 && <div>{t('content.myProposals')}</div>}
          {activeTab === 3 && <div>{t('content.manageActiveProposals')}</div>}
          {activeTab === 4 && <div>{t('content.managementAgreement')}</div>}
        </Box>
      </Content>
    </PageWithHeader>
  );
};
