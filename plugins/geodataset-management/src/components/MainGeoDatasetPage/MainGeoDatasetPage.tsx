import { Content, PageWithHeader, Progress } from '@backstage/core-components';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Box, Button, Tab, Tabs, Typography } from '@material-ui/core';
import React, { useState, useEffect, useCallback } from 'react';
import CreateIcon from '@mui/icons-material/Create';
import InfoIcon from '@mui/icons-material/Info';
import { geodatasetManagementTranslationRef } from '../../translation';
import { DatasetEntry } from '../../data';
import { useMainGeoDatasetStyles } from './styles';
import { DatasetToolbar } from './DatasetToolbar';
import { DatasetPaginationInfo } from './DatasetPaginationInfo';
import { DatasetTable } from './DatasetTable';
import { ReviewDialog } from './ReviewDialog';

// Map security class to color
const mapSecurityClass = (
  securityClass?: string,
): 'green' | 'yellow' | 'red' => {
  switch (securityClass) {
    case 'Öppen data':
      return 'green';
    case 'Begränsad åtkomst':
      return 'yellow';
    case 'Skyddad':
      return 'red';
    default:
      return 'green';
  }
};

// Map status to badge status
const mapStatus = (status?: string): 'error' | 'warning' | 'success' => {
  switch (status) {
    case 'Godkänd':
      return 'success';
    case 'Utkast':
      return 'warning';
    case 'Under granskning':
      return 'error';
    default:
      return 'warning';
  }
};

export const MainGeoDatasetPage = () => {
  const classes = useMainGeoDatasetStyles();
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  const configApi = useApi(configApiRef);
  const catalogApi = useApi(catalogApiRef);
  const orgName =
    configApi.getOptionalString('organization.name') ?? 'Backstage';

  const [activeTab, setActiveTab] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [selectedView, setSelectedView] = useState('standard');
  const [showDeleted, setShowDeleted] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRows, setSelectedRows] = useState<DatasetEntry[]>([]);
  const [datasetEntries, setDatasetEntries] = useState<DatasetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await catalogApi.getEntities({
        filter: { kind: 'MetadataEntry' },
      });

      const entries: DatasetEntry[] = response.items.map((entity, index) => {
        const metadata =
          (entity.spec?.metadata as Record<string, unknown>) ?? {};
        const layerInfo =
          (metadata.layerInfo as Record<string, unknown>) ?? metadata;

        const securityClass = layerInfo.securityClass as string | undefined;
        const status = layerInfo.status as string | undefined;
        const titel =
          (layerInfo.title as string) ??
          (layerInfo.layerName as string) ??
          entity.metadata.title ??
          entity.metadata.name ??
          'Untitled';
        const sammanfattning =
          (layerInfo.summary as string) ??
          (layerInfo.description as string) ??
          '';
        const oppenData =
          typeof layerInfo.openData === 'boolean'
            ? (layerInfo.openData as boolean)
            : securityClass === 'Öppen data';

        return {
          id: entity.metadata.name ?? String(index),
          signaturstatus: mapStatus(status),
          titel,
          skyddsklass: mapSecurityClass(securityClass),
          sammanfattning,
          oppenData,
        };
      });

      setDatasetEntries(entries);
    } catch (err) {
      console.error('Error fetching dataset entries:', err);
      setDatasetEntries([]);
    } finally {
      setLoading(false);
    }
  }, [catalogApi]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleTabChange = (
    _event: React.ChangeEvent<{}>,
    newValue: number,
  ) => {
    setActiveTab(newValue);
  };

  return (
    <PageWithHeader title={orgName} themeId="home">
      <Content>
        <Box>
          <div className={`${classes.reviewChange}`}>
            <div className={`${classes.reviewChangeInfo}`}>
              <InfoIcon />
              {t('review.changes')}
            </div>
            <Button
              onClick={() => setReviewModalOpen(true)}
              variant="contained"
            >
              <CreateIcon />
              {t('review.startReview')}
            </Button>
          </div>
        </Box>
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
                totalRows={datasetEntries.length}
                selectedCount={selectedRows.length}
                showDeleted={showDeleted}
                onShowDeletedChange={setShowDeleted}
              />

              {loading ? (
                <Progress />
              ) : (
                <DatasetTable
                  data={datasetEntries}
                  pageSize={pageSize}
                  onSelectionChange={setSelectedRows}
                />
              )}
            </>
          )}
          {activeTab === 1 && <div>{t('content.contactPerson')}</div>}
          {activeTab === 2 && <div>{t('content.myProposals')}</div>}
          {activeTab === 3 && <div>{t('content.manageActiveProposals')}</div>}
          {activeTab === 4 && <div>{t('content.managementAgreement')}</div>}
        </Box>

        <ReviewDialog
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
        />
      </Content>
    </PageWithHeader>
  );
};
