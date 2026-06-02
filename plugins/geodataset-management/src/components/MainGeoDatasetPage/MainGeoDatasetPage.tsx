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
import { usePermission } from '@backstage/plugin-permission-react';
import { metadataEntryUpdatePermission } from '@internal/backstage-plugin-geoportia-metadata-common';
import { useReviewSuggestions } from '../../hooks/useReviewSuggestions';
import { MainDatasetPreviewDialog } from './MainDatasetPreviewDialog';
import { EditDatasetDialog } from './EditDatasetDialog';
import { setMetadataEntryDeleted } from './metadataApi';
import { metadataEntryDeletePermission } from '@internal/backstage-plugin-geoportia-metadata-common';

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
  const { allowed: canReview } = usePermission({
    permission: metadataEntryUpdatePermission,
    resourceRef: undefined,
  });
  const {
    value: reviewItems = [],
    loading: reviewItemsLoading,
    error: reviewItemsError,
    retry: retryReviewItems,
  } = useReviewSuggestions();

  // Items pending review (not yet reviewed in this session)
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const toReviewItems = useMemo(
    () => reviewItems.filter(r => !reviewedIds.includes(r.id)),
    [reviewItems, reviewedIds],
  );
  const [previewEntry, setPreviewEntry] = useState<DatasetEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<DatasetEntry | null>(null);
  const [editEntry, setEditEntry] = useState<DatasetEntry | null>(null);
  const [mutating, setMutating] = useState(false);

  const columnOptions = useMemo(
    () => [
      { field: 'signaturstatus', label: t('table.signatureStatus') },
      { field: 'titel', label: t('table.title') },
      { field: 'skyddsklass', label: t('table.protectionClass') },
      { field: 'sammanfattning', label: t('table.summary') },
      { field: 'oppenData', label: t('table.openData') },
    ],
    [t],
  );
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    columnOptions.map(c => c.field),
  );


  const { allowed: canManage } = usePermission({
    permission: metadataEntryDeletePermission,
    resourceRef: "GG-U-Roll-GeoPortia-SuperAdmin",
  });

  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await catalogApi.getEntities({
        filter: { kind: 'MetadataEntry' },
      });
      const entries: DatasetEntry[] = response.items.map((entity, index) => {
        const specMetadata =
          (entity.spec?.metadata as Record<string, unknown>) ?? {};
        const layerInfo =
          (specMetadata.layerInfo as Record<string, unknown>) ?? specMetadata;

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

        const rawContact = layerInfo.contactPerson as unknown;
        const contactPerson: string[] | undefined = Array.isArray(rawContact)
          ? (rawContact as string[])
          : typeof rawContact === 'string' && rawContact.length > 0
          ? [rawContact]
          : undefined;

        const describedEntityRef =
          (entity.metadata.annotations?.[
            'geoportia.se/described-entity-ref'
          ] as string | undefined) ??
          (entity.spec?.describedEntityRef as string | undefined);
        const entityRef =
          describedEntityRef ??
          `metadataentry:${entity.metadata.namespace ?? 'default'}/${
            entity.metadata.name
          }`;
        const isDeleted =
          entity.metadata.annotations?.['geoportia.se/deleted'] === 'true' ||
          (entity.spec as { deleted?: boolean } | undefined)?.deleted === true;

        return {
          id: entity.metadata.name ?? String(index),
          entityRef,
          isDeleted,
          signaturstatus: mapStatus(status),
          titel,
          skyddsklass: mapSecurityClass(securityClass),
          sammanfattning,
          oppenData,
          uuid: entity.metadata.uid ?? entity.metadata.name ?? String(index),
          protectionClassLabel: securityClass,
          contactPerson,
          schema: entity.spec?.schema as Record<string, unknown> | undefined,
          metadataValues: specMetadata,
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
        flipDeletedLocally(entry.entityRef, !deleted);
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

  const handleSaved: React.ComponentProps<typeof EditDatasetDialog>['onSaved'] =
    useCallback((entry, metadata) => {
      const layerInfo =
        ((metadata.layerInfo as Record<string, unknown>) ?? metadata) ?? {};
      const pick = (key: string): string | undefined => {
        const v = layerInfo[key];
        return typeof v === 'string' ? v : undefined;
      };
      const openData = layerInfo.openData;
      setDatasetEntries(prev =>
        prev.map(e =>
          e.entityRef === entry.entityRef
            ? {
                ...e,
                titel: pick('title') ?? pick('layerName') ?? e.titel,
                sammanfattning:
                  pick('summary') ?? pick('description') ?? e.sammanfattning,
                skyddsklass: mapSecurityClass(pick('securityClass')),
                signaturstatus: mapStatus(pick('status')),
                oppenData:
                  typeof openData === 'boolean' ? openData : e.oppenData,
              }
            : e,
        ),
      );
    }, []);

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
          {canReview && toReviewItems.length > 0 && (
            <div className={classes.reviewChange}>
              <div className={classes.reviewChangeInfo}>
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
          )}
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
                columnOptions={columnOptions}
                visibleColumns={visibleColumns}
                onVisibleColumnsChange={setVisibleColumns}
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
                  visibleColumns={visibleColumns}
                  canManage={canManage}
                  onSelectionChange={setSelectedRows}
                  onRowClick={setPreviewEntry}
                  onEdit={setEditEntry}
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
          open={reviewModalOpen && canReview}
          onClose={() => setReviewModalOpen(false)}
          reviewItems={reviewItems}
          reviewItemsLoading={reviewItemsLoading}
          reviewItemsError={reviewItemsError}
          retryReviewItems={retryReviewItems}
          reviewedIds={reviewedIds}
          setReviewedIds={setReviewedIds}
        />

        <MainDatasetPreviewDialog
          open={previewEntry !== null}
          entry={previewEntry}
          onClose={() => setPreviewEntry(null)}
        />

        <EditDatasetDialog
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={handleSaved}
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
