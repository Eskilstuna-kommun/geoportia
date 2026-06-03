import { Content, PageWithHeader, Progress } from '@backstage/core-components';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Box, Button, Typography } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import React, { useMemo, useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { CreateDatasetDialog } from '@internal/backstage-plugin-geoportia-metadata';
import { geodatasetManagementTranslationRef } from '../../translation';
import { useMainGeoDatasetStyles } from '../MainGeoDatasetPage/styles';
import {
  DatasetToolbar,
  RowDensity,
} from '../MainGeoDatasetPage/DatasetToolbar';
import { DatasetPaginationInfo } from '../MainGeoDatasetPage/DatasetPaginationInfo';
import { DatasetListTable, DatasetRow } from './DatasetListTable';

const today = (): string => new Date().toISOString().slice(0, 10);

type Stub = {
  name: string;
  database: string;
  createdAt: string;
};

export const DatasetListPage = () => {
  const classes = useMainGeoDatasetStyles();
  const configApi = useApi(configApiRef);
  const catalogApi = useApi(catalogApiRef);
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  const orgName =
    configApi.getOptionalString('organization.name') ?? 'Backstage';
  const [stubs, setStubs] = useState<Stub[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const [searchText, setSearchText] = useState('');
  const [selectedView, setSelectedView] = useState('standard');
  const [rowDensity, setRowDensity] = useState<RowDensity>('comfortable');
  const [pageSize, setPageSize] = useState(25);
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedRows, setSelectedRows] = useState<DatasetRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const columnOptions = useMemo(
    () => [
      { field: 'namn', label: t('datasetList.columns.namn') },
      { field: 'beskrivning', label: t('datasetList.columns.beskrivning') },
      { field: 'databas', label: t('datasetList.columns.databas') },
      { field: 'skapad', label: t('datasetList.columns.skapad') },
      { field: 'andrad', label: t('datasetList.columns.andrad') },
    ],
    [t],
  );
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() =>
    columnOptions.map(c => c.field),
  );

  const { value: catalogRows, loading } = useAsync(async () => {
    const { items } = await catalogApi.getEntities({
      filter: { kind: 'Schema', 'spec.dialect': 'arcgis' },
      fields: [
        'kind',
        'metadata.name',
        'metadata.namespace',
        'metadata.title',
        'metadata.description',
        'metadata.annotations',
        'spec.database',
      ],
    });
    return items.map<DatasetRow>(entity => {
      const annotations = entity.metadata.annotations ?? {};
      return {
        id: `${entity.metadata.namespace ?? 'default'}/${entity.metadata.name}`,
        namn: entity.metadata.title ?? entity.metadata.name,
        beskrivning: entity.metadata.description ?? '',
        databas: (entity.spec as { database?: string } | undefined)?.database ?? '',
        skapad: annotations['geoportia.se/created-at'] ?? '',
        andrad: annotations['geoportia.se/updated-at'] ?? '',
        isDeleted: annotations['geoportia.se/deleted'] === 'true',
      };
    });
  }, [catalogApi, refreshKey]);

  const allRows: DatasetRow[] = useMemo(() => {
    const real = catalogRows ?? [];
    const realNames = new Set(real.map(r => r.namn));
    const stubRows: DatasetRow[] = stubs
      .filter(s => !realNames.has(s.name))
      .map(s => ({
        id: `stub-${s.name}`,
        namn: s.name,
        beskrivning: '',
        databas: s.database,
        skapad: s.createdAt,
        andrad: s.createdAt,
        isDeleted: false,
      }));
    return [...real, ...stubRows];
  }, [catalogRows, stubs]);

  const displayed = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return allRows
      .filter(r => (showDeleted ? r.isDeleted : !r.isDeleted))
      .filter(r => {
        if (!q) return true;
        return (
          r.namn.toLowerCase().includes(q) ||
          r.beskrivning.toLowerCase().includes(q) ||
          r.databas.toLowerCase().includes(q)
        );
      });
  }, [allRows, searchText, showDeleted]);

  const handleCreated = (datasetName: string, database: string) => {
    setStubs(prev =>
      prev.some(s => s.name === datasetName)
        ? prev
        : [...prev, { name: datasetName, database, createdAt: today() }],
    );

    setRefreshKey(k => k + 1);
  };

  const handleDelete = (row: DatasetRow) =>
    setStubs(prev => prev.filter(s => s.name !== row.namn));
  const handleRestore = (_row: DatasetRow) => {
  };

  return (
    <PageWithHeader title={orgName} themeId="home">
      <Content>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          className={classes.pageTitle}
        >
          <Typography variant="h5">{t('datasetList.pageTitle')}</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            {t('datasetList.create')}
          </Button>
        </Box>

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
          toolsToShow={['columnToggle', 'filter', 'viewSelect']}
        />

        <DatasetPaginationInfo
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          totalRows={displayed.length}
          selectedCount={selectedRows.length}
          showDeleted={showDeleted}
          onShowDeletedChange={setShowDeleted}
        />

        {loading && !catalogRows ? (
          <Progress />
        ) : (
          <DatasetListTable
            data={displayed}
            pageSize={pageSize}
            rowDensity={rowDensity}
            visibleColumns={visibleColumns}
            onSelectionChange={setSelectedRows}
            onDelete={handleDelete}
            onRestore={handleRestore}
          />
        )}

        <CreateDatasetDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      </Content>
    </PageWithHeader>
  );
};
