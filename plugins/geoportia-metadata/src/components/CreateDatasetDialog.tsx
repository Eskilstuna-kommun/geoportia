import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import {
  catalogApiRef,
  EntityDisplayName,
} from '@backstage/plugin-catalog-react';
import type { Entity } from '@backstage/catalog-model';
import React, { useEffect, useState, useCallback } from 'react';
import useAsync from 'react-use/lib/useAsync';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { geoportiaMetadataTranslationRef } from '../translation';

export type CreateDatasetDialogProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (datasetName: string, database: string) => void;
};

type Versioning = '' | 'NONE' | 'TRADITIONAL' | 'BRANCH';
type Status =
  | ''
  | 'TO_BE_SET'
  | 'DELETED'
  | 'SUGGESTED'
  | 'APPROVED'
  | 'TO_BE_UNPUBLISHED';

export const CreateDatasetDialog = ({
  open,
  onClose,
  onCreated,
}: CreateDatasetDialogProps) => {
  const { t } = useTranslationRef(geoportiaMetadataTranslationRef);
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  const catalogApi = useApi(catalogApiRef);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDatabaseEntity, setSelectedDatabaseEntity] =
    useState<Entity | null>(null);
  const [versioning, setVersioning] = useState<Versioning>('');
  const [allowZValues, setAllowZValues] = useState(false);
  const [zMin, setZMin] = useState('');
  const [zMax, setZMax] = useState('');
  const [status, setStatus] = useState<Status>('');

  // Reset form whenever the dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setSelectedDatabaseEntity(null);
      setVersioning('');
      setAllowZValues(false);
      setZMin('');
      setZMax('');
      setStatus('');
    }
  }, [open]);

  // Fetch database entities from catalog
  const { value: databaseEntities, loading: loadingDatabases } = useAsync(
    async () => {
      const { items } = await catalogApi.getEntities({
        filter: { kind: 'Resource', 'spec.type': 'database' },
        fields: [
          'kind',
          'metadata.name',
          'metadata.namespace',
          'metadata.title',
          'metadata.description',
          'spec.type',
        ],
      });
      return items;
    },
    [catalogApi],
  );

  // Handle database selection
  const handleDatabaseChange = useCallback(
    (_event: unknown, entity: Entity | null) => {
      setSelectedDatabaseEntity(entity);
    },
    [],
  );

  const [createState, create] = useAsyncFn(async () => {
    const database = selectedDatabaseEntity?.metadata.name;
    if (!database) {
      throw new Error(t('scaffolder.datasetSelect.modal.errorNoDatabase'));
    }
    const datasetName = name.trim();
    if (!datasetName) {
      throw new Error(
        t('scaffolder.datasetSelect.modal.errorDatasetNameRequired'),
      );
    }

    const zMinNum = zMin === '' ? NaN : Number(zMin);
    const zMaxNum = zMax === '' ? NaN : Number(zMax);
    const hasValidZExtent =
      allowZValues && Number.isFinite(zMinNum) && Number.isFinite(zMaxNum);
    if (allowZValues && zMin !== '' && zMax !== '' && zMinNum >= zMaxNum) {
      throw new Error(t('scaffolder.datasetSelect.modal.errorZExtentInvalid'));
    }

    const baseUrl = await discoveryApi.getBaseUrl('geoportia-metadata');
    const response = await fetchApi.fetch(
      `${baseUrl}/arcgis-sde/databases/${encodeURIComponent(database)}/datasets`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName,
          description: description.trim() || undefined,
          versioning: versioning || undefined,
          isTraditionalVersioned: versioning === 'TRADITIONAL',
          isBranchVersioned: versioning === 'BRANCH',
          allowZValues,
          zExtent: hasValidZExtent
            ? { min: zMinNum, max: zMaxNum }
            : undefined,
          status: status || undefined,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        t('scaffolder.datasetSelect.modal.errorCreateFailed', {
          status: String(response.status),
          statusText: response.statusText,
          body,
        }),
      );
    }

    onCreated?.(datasetName, database);
    onClose();
  }, [
    selectedDatabaseEntity,
    name,
    description,
    versioning,
    allowZValues,
    zMin,
    zMax,
    status,
    discoveryApi,
    fetchApi,
    onCreated,
    onClose,
    t,
  ]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('scaffolder.datasetSelect.modal.title')}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          required
          margin="dense"
          label={t('scaffolder.datasetSelect.modal.name')}
          placeholder={t('scaffolder.datasetSelect.modal.namePlaceholder')}
          fullWidth
          variant="outlined"
          value={name}
          onChange={e => setName(e.target.value)}
          helperText={t('scaffolder.datasetSelect.modal.nameHelper')}
        />
        <TextField
          margin="dense"
          label={t('scaffolder.datasetSelect.modal.descriptionField')}
          placeholder={t(
            'scaffolder.datasetSelect.modal.descriptionPlaceholder',
          )}
          fullWidth
          variant="outlined"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <Autocomplete
          value={selectedDatabaseEntity}
          loading={loadingDatabases}
          onChange={handleDatabaseChange}
          options={databaseEntities ?? []}
          getOptionLabel={option =>
            option.metadata.title || option.metadata.name
          }
          renderOption={option => <EntityDisplayName entityRef={option} />}
          renderInput={params => (
            <TextField
              {...params}
              required
              margin="dense"
              label={t('scaffolder.datasetSelect.modal.database')}
              variant="outlined"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loadingDatabases ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        <TextField
          select
          required
          margin="dense"
          label={t('scaffolder.datasetSelect.modal.versioning')}
          fullWidth
          variant="outlined"
          value={versioning}
          onChange={e => setVersioning(e.target.value as Versioning)}
        >
          <MenuItem value="" disabled>
            {t('scaffolder.datasetSelect.modal.versioningSelect')}
          </MenuItem>
          <MenuItem value="NONE">
            {t('scaffolder.datasetSelect.modal.versioningNone')}
          </MenuItem>
          <MenuItem value="TRADITIONAL">
            {t('scaffolder.datasetSelect.modal.versioningTraditional')}
          </MenuItem>
          <MenuItem value="BRANCH">
            {t('scaffolder.datasetSelect.modal.versioningBranch')}
          </MenuItem>
        </TextField>
        <Box mt={1} mb={1}>
          <FormControlLabel
            control={
              <Switch
                checked={allowZValues}
                onChange={e => setAllowZValues(e.target.checked)}
                color="primary"
              />
            }
            label={t('scaffolder.datasetSelect.modal.allowZValues')}
          />
        </Box>
        {allowZValues && (
          <Box display="flex" style={{ gap: 8 }}>
            <TextField
              margin="dense"
              type="number"
              label={t('scaffolder.datasetSelect.modal.zMin')}
              fullWidth
              variant="outlined"
              value={zMin}
              onChange={e => setZMin(e.target.value)}
              helperText={t('scaffolder.datasetSelect.modal.zExtentHelper')}
            />
            <TextField
              margin="dense"
              type="number"
              label={t('scaffolder.datasetSelect.modal.zMax')}
              fullWidth
              variant="outlined"
              value={zMax}
              onChange={e => setZMax(e.target.value)}
            />
          </Box>
        )}
        <TextField
          select
          required
          margin="dense"
          label={t('scaffolder.datasetSelect.modal.status')}
          fullWidth
          variant="outlined"
          value={status}
          onChange={e => setStatus(e.target.value as Status)}
        >
          <MenuItem value="" disabled>
            {t('scaffolder.datasetSelect.modal.statusSelect')}
          </MenuItem>
          <MenuItem value="TO_BE_SET">
            {t('scaffolder.datasetSelect.modal.statusToBeSet')}
          </MenuItem>
          <MenuItem value="DELETED">
            {t('scaffolder.datasetSelect.modal.statusDeleted')}
          </MenuItem>
          <MenuItem value="SUGGESTED">
            {t('scaffolder.datasetSelect.modal.statusSuggested')}
          </MenuItem>
          <MenuItem value="APPROVED">
            {t('scaffolder.datasetSelect.modal.statusApproved')}
          </MenuItem>
          <MenuItem value="TO_BE_UNPUBLISHED">
            {t('scaffolder.datasetSelect.modal.statusToBeUnpublished')}
          </MenuItem>
        </TextField>
        {createState.error && (
          <Typography variant="body2" color="error" style={{ marginTop: 8 }}>
            {createState.error.message}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={createState.loading}
        >
          {t('scaffolder.datasetSelect.modal.back')}
        </Button>
        <Button
          onClick={() => create()}
          color="primary"
          variant="contained"
          disabled={
            !name.trim() ||
            !selectedDatabaseEntity ||
            !versioning ||
            !status ||
            createState.loading
          }
        >
          {createState.loading ? (
            <CircularProgress size={20} />
          ) : (
            t('scaffolder.datasetSelect.modal.save')
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
