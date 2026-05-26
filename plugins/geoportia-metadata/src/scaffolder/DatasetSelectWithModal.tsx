import React, { useCallback, useMemo, useState } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import TextField from '@material-ui/core/TextField';
import Autocomplete, {
  createFilterOptions,
} from '@material-ui/lab/Autocomplete';
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
  Typography,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import { makeStyles } from '@material-ui/core/styles';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import useAsync from 'react-use/lib/useAsync';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import {
  catalogApiRef,
  entityPresentationApiRef,
  EntityDisplayName,
} from '@backstage/plugin-catalog-react';
import { stringifyEntityRef } from '@backstage/catalog-model';
import type { Entity } from '@backstage/catalog-model';
import { geoportiaMetadataTranslationRef } from '../translation';

const useStyles = makeStyles(theme => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
    width: '100%',
  },
  toolbar: {
    display: 'flex',
    flexDirection: 'row-reverse',
  },
  createButton: {
    whiteSpace: 'nowrap',
  },
}));

export const DatasetSelectWithModal = (props: WidgetProps) => {
  const { id, value, onChange, disabled, readonly, required, formContext } =
    props;
  const classes = useStyles();
  const { t } = useTranslationRef(geoportiaMetadataTranslationRef);

  const catalogApi = useApi(catalogApiRef);
  const entityPresentationApi = useApi(entityPresentationApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);

  const parentFormData = (formContext as { parentFormData?: unknown })
    ?.parentFormData as Record<string, unknown> | undefined;
  const selectedDatabase =
    typeof parentFormData?.database === 'string'
      ? (parentFormData.database as string)
      : undefined;

  const { value: sdeBackedDatabases } = useAsync(async () => {
    const baseUrl = await discoveryApi.getBaseUrl('geoportia-metadata');
    const response = await fetchApi.fetch(
      `${baseUrl}/arcgis-sde/databases`,
    );
    if (!response.ok) {
      return [] as string[];
    }
    const body = (await response.json()) as { items: string[] };
    return body.items ?? [];
  }, [discoveryApi, fetchApi]);

  const isSelectedDatabaseSdeBacked = useMemo(() => {
    if (!selectedDatabase || !sdeBackedDatabases) return false;
    return sdeBackedDatabases.includes(selectedDatabase);
  }, [selectedDatabase, sdeBackedDatabases]);

  // Optimistic stubs created via the modal that aren't in the catalog yet.
  const [stubNames, setStubNames] = useState<string[]>([]);

  const {
    value: datasets,
    loading: loadingDatasets,
    error: datasetsError,
  } = useAsync(async () => {
    const filter: Record<string, string> = {
      kind: 'Schema',
      'spec.dialect': 'arcgis',
    };
    if (selectedDatabase) {
      filter['spec.database'] = selectedDatabase;
    }
    const { items } = await catalogApi.getEntities({
      filter,
      fields: [
        'kind',
        'metadata.name',
        'metadata.namespace',
        'metadata.title',
        'metadata.description',
        'spec.dialect',
        'spec.database',
      ],
    });
    const entityRefToPresentation = new Map(
      await Promise.all(
        items.map(async item => {
          const presentation = await entityPresentationApi.forEntity(item)
            .promise;
          return [stringifyEntityRef(item), presentation] as const;
        }),
      ),
    );
    return { items, entityRefToPresentation };
  }, [catalogApi, entityPresentationApi, selectedDatabase]);

  type Option = Entity | { __stub: true; name: string };

  const options: Option[] = useMemo(() => {
    const real = datasets?.items ?? [];
    const realNames = new Set(real.map(e => e.metadata.name));
    const stubs: Option[] = stubNames
      .filter(n => !realNames.has(n))
      .map(name => ({ __stub: true as const, name }));
    return [...real, ...stubs];
  }, [datasets, stubNames]);

  const selectedOption =
    options.find(o =>
      '__stub' in o ? o.name === value : o.metadata.name === value,
    ) ?? null;

  const onSelect = useCallback(
    (_event: unknown, selected: Option | null) => {
      if (!selected) {
        onChange(undefined);
        return;
      }
      onChange('__stub' in selected ? selected.name : selected.metadata.name);
    },
    [onChange],
  );

  // ---------- modal state ----------
  type Versioning = '' | 'NONE' | 'TRADITIONAL' | 'BRANCH';
  type Status =
    | ''
    | 'TO_BE_SET'
    | 'DELETED'
    | 'SUGGESTED'
    | 'APPROVED'
    | 'TO_BE_UNPUBLISHED';

  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newModalDatabase, setNewModalDatabase] = useState('');
  const [newVersioning, setNewVersioning] = useState<Versioning>('');
  const [newAllowZValues, setNewAllowZValues] = useState(false);
  const [newStatus, setNewStatus] = useState<Status>('');

  const handleOpenModal = () => {
    setNewName('');
    setNewDescription('');
    setNewModalDatabase(selectedDatabase ?? '');
    setNewVersioning('');
    setNewAllowZValues(false);
    setNewStatus('');
    setModalOpen(true);
  };
  const handleCloseModal = () => setModalOpen(false);

  const [createState, createDataset] = useAsyncFn(async () => {
    const databaseToUse = newModalDatabase || selectedDatabase;
    if (!databaseToUse) {
      throw new Error(t('scaffolder.datasetSelect.modal.errorNoDatabase'));
    }
    if (
      sdeBackedDatabases &&
      !sdeBackedDatabases.includes(databaseToUse)
    ) {
      throw new Error(t('scaffolder.datasetSelect.modal.errorNotSdeBacked'));
    }
    const datasetName = newName.trim();
    if (!datasetName) {
      throw new Error(
        t('scaffolder.datasetSelect.modal.errorDatasetNameRequired'),
      );
    }

    const baseUrl = await discoveryApi.getBaseUrl('geoportia-metadata');
    const response = await fetchApi.fetch(
      `${baseUrl}/arcgis-sde/databases/${encodeURIComponent(
        databaseToUse,
      )}/datasets`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetName,
          description: newDescription.trim() || undefined,
          versioning: newVersioning || undefined,
          allowZValues: newAllowZValues,
          status: newStatus || undefined,
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
    setStubNames(prev =>
      prev.includes(datasetName) ? prev : [...prev, datasetName],
    );
    onChange(datasetName);
    handleCloseModal();
  }, [
    selectedDatabase,
    newModalDatabase,
    sdeBackedDatabases,
    newName,
    newDescription,
    newVersioning,
    newAllowZValues,
    newStatus,
    discoveryApi,
    fetchApi,
    onChange,
    t,
  ]);

  // ---------- render ----------
  if (loadingDatasets) {
    return (
      <Box className={classes.container}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="textSecondary">
          {t('scaffolder.datasetSelect.loadingDatasets')}
        </Typography>
      </Box>
    );
  }

  const createButtonTooltip = !selectedDatabase
    ? t('scaffolder.datasetSelect.createTooltipNoDatabase')
    : !isSelectedDatabaseSdeBacked
      ? t('scaffolder.datasetSelect.modal.errorNotSdeBacked')
      : undefined;

  return (
    <>
      <Box className={classes.container}>
        <div className={classes.toolbar}>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleOpenModal}
            disabled={
              disabled ||
              readonly ||
              !selectedDatabase
            }
            className={classes.createButton}
            title={createButtonTooltip}
          >
            {t('scaffolder.datasetSelect.createButton')}
          </Button>
        </div>

        <Autocomplete<Option, false, false, false>
          id={id}
          value={selectedOption}
          options={options}
          onChange={onSelect}
          disabled={disabled || readonly}
          getOptionLabel={option => {
            if ('__stub' in option) {
              return `${option.name} (${t(
                'scaffolder.datasetSelect.optionPending',
              )})`;
            }
            return (
              datasets?.entityRefToPresentation.get(stringifyEntityRef(option))
                ?.entityRef ?? option.metadata.name
            );
          }}
          renderOption={option =>
            '__stub' in option ? (
              <Typography variant="body2">
                {option.name}{' '}
                <Typography
                  variant="caption"
                  color="textSecondary"
                  component="span"
                >
                  ({t('scaffolder.datasetSelect.optionPendingShort')})
                </Typography>
              </Typography>
            ) : (
              <EntityDisplayName entityRef={option} />
            )
          }
          renderInput={params => (
            <TextField
              {...params}
              margin="dense"
              variant="outlined"
              required={required}
              disabled={disabled || readonly}
              error={Boolean(datasetsError)}
              helperText={
                datasetsError
                  ? t('scaffolder.datasetSelect.fetchError', {
                      message: datasetsError.message,
                    })
                  : !selectedDatabase
                    ? t('scaffolder.datasetSelect.selectDatabaseHelper')
                    : undefined
              }
            />
          )}
          filterOptions={createFilterOptions({
            stringify: option =>
              '__stub' in option
                ? option.name
                : datasets?.entityRefToPresentation.get(
                    stringifyEntityRef(option),
                  )?.primaryTitle ?? option.metadata.name,
          })}
        />
      </Box>

      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
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
            value={newName}
            onChange={e => setNewName(e.target.value)}
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
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
          />
          <TextField
            select
            required
            margin="dense"
            label={t('scaffolder.datasetSelect.modal.database')}
            fullWidth
            variant="outlined"
            value={newModalDatabase}
            onChange={e => setNewModalDatabase(e.target.value)}
          >
            {(sdeBackedDatabases ?? []).map(db => (
              <MenuItem key={db} value={db}>
                {db}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            required
            margin="dense"
            label={t('scaffolder.datasetSelect.modal.versioning')}
            fullWidth
            variant="outlined"
            value={newVersioning}
            onChange={e => setNewVersioning(e.target.value as Versioning)}
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
                  checked={newAllowZValues}
                  onChange={e => setNewAllowZValues(e.target.checked)}
                  color="primary"
                />
              }
              label={t('scaffolder.datasetSelect.modal.allowZValues')}
            />
          </Box>
          <TextField
            select
            required
            margin="dense"
            label={t('scaffolder.datasetSelect.modal.status')}
            fullWidth
            variant="outlined"
            value={newStatus}
            onChange={e => setNewStatus(e.target.value as Status)}
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
            onClick={handleCloseModal}
            disabled={createState.loading}
          >
            {t('scaffolder.datasetSelect.modal.back')}
          </Button>
          <Button
            onClick={() => createDataset()}
            color="primary"
            variant="contained"
            disabled={
              !newName.trim() ||
              !newModalDatabase ||
              !newVersioning ||
              !newStatus ||
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
    </>
  );
};
