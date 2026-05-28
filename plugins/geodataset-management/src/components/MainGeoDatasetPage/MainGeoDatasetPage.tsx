import { Content, PageWithHeader, Progress } from '@backstage/core-components';
import {
  useApi,
  configApiRef,
  fetchApiRef,
  discoveryApiRef,
} from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tab,
  Tabs,
  Typography,
} from '@material-ui/core';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import CreateIcon from '@mui/icons-material/Create';
import InfoIcon from '@mui/icons-material/Info';
import { geodatasetManagementTranslationRef } from '../../translation';
import { DatasetEntry } from '../../data';
import { useMainGeoDatasetStyles } from './styles';
import { DatasetToolbar, RowDensity } from './DatasetToolbar';
import { DatasetPaginationInfo } from './DatasetPaginationInfo';
import { DatasetTable } from './DatasetTable';
import { ReviewDialog } from './ReviewDialog';
import { entityToDatasetEntry } from './entityMapping';
import { setMetadataEntryDeleted } from './metadataApi';

export const MainGeoDatasetPage = () => {
  const classes = useMainGeoDatasetStyles();
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  const configApi = useApi(configApiRef);
  const catalogApi = useApi(catalogApiRef);
  const fetchApi = useApi(fetchApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const orgName =
    configApi.getOptionalString('organization.name') ?? 'Backstage';

  const [activeTab, setActiveTab] = useState(0);
  const [searchText, setSearchText] = useState('');
  const [selectedView, setSelectedView] = useState('standard');
  const [rowDensity, setRowDensity] = useState<RowDensity>('comfortable');
  const [showDeleted, setShowDeleted] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRows, setSelectedRows] = useState<DatasetEntry[]>([]);
  const [datasetEntries, setDatasetEntries] = useState<DatasetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState<DatasetEntry | null>(null);
  const [mutating, setMutating] = useState(false);

  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await catalogApi.getEntities({
        filter: { kind: 'MetadataEntry' },
      });
      setDatasetEntries(
        response.items.map((entity, i) => entityToDatasetEntry(entity, String(i))),
      );
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

  // Optimistically flip the `isDeleted` flag for one row.
  const flipDeletedLocally = useCallback(
    (entityRef: string, deleted: boolean) =>
      setDatasetEntries(prev =>
        prev.map(e =>
          e.entityRef === entityRef ? { ...e, isDeleted: deleted } : e,
        ),
      ),
    [],
  );

  const setEntryDeleted = useCallback(
    async (entry: DatasetEntry, deleted: boolean) => {
      if (!entry.entityRef) return;
      // Optimistic update — the row moves immediately. The catalog
      // EntityProvider polls every ~5s; we do NOT refetch here because
      // the stale catalog read would overwrite this state.
      flipDeletedLocally(entry.entityRef, deleted);
      try {
        setMutating(true);
        await setMetadataEntryDeleted(
          { discoveryApi, fetchApi },
          entry.entityRef,
          deleted,
        );
      } catch (err) {
        console.error('Soft-delete error:', err);
        flipDeletedLocally(entry.entityRef, !deleted); // rollback
      } finally {
        setMutating(false);
      }
    },
    [discoveryApi, fetchApi, flipDeletedLocally],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteEntry) return;
    const entry = deleteEntry;
    setDeleteEntry(null);
    await setEntryDeleted(entry, true);
  }, [deleteEntry, setEntryDeleted]);

  const handleRestore = useCallback(
    (entry: DatasetEntry) => setEntryDeleted(entry, false),
    [setEntryDeleted],
  );

  const displayedEntries = useMemo(
    () =>
      datasetEntries.filter(e => (showDeleted ? e.isDeleted : !e.isDeleted)),
    [datasetEntries, showDeleted],
  );

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
                rowDensity={rowDensity}
                onRowDensityChange={setRowDensity}
              />

              <DatasetPaginationInfo
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                totalRows={displayedEntries.length}
                selectedCount={selectedRows.length}
                showDeleted={showDeleted}
                onShowDeletedChange={setShowDeleted}
              />

              {loading ? (
                <Progress />
              ) : (
                <DatasetTable
                  data={displayedEntries}
                  pageSize={pageSize}
                  rowDensity={rowDensity}
                  onSelectionChange={setSelectedRows}
                  onDelete={setDeleteEntry}
                  onRestore={handleRestore}
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

        <Dialog
          open={Boolean(deleteEntry)}
          onClose={() => (mutating ? undefined : setDeleteEntry(null))}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>{t('delete.confirmTitle')}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('delete.confirmMessage', {
                name: deleteEntry?.titel ?? '',
              })}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteEntry(null)} disabled={mutating}>
              {t('delete.cancel')}
            </Button>
            <Button
              onClick={handleConfirmDelete}
              color="secondary"
              variant="contained"
              disabled={mutating}
            >
              {t('delete.confirm')}
            </Button>
          </DialogActions>
        </Dialog>
      </Content>
    </PageWithHeader>
  );
};
