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
  Typography,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import { makeStyles } from '@material-ui/core/styles';
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
import { parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import type { Entity } from '@backstage/catalog-model';
import { geoportiaMetadataTranslationRef } from '../translation';
import { CreateDatasetDialog } from '../components/CreateDatasetDialog';

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

  const selectedDatabase = useMemo(() => {
    const raw = parentFormData?.database;
    if (typeof raw !== 'string' || !raw) return undefined;
    if (raw.includes(':') || raw.includes('/')) {
      try {
        return parseEntityRef(raw).name;
      } catch {
        return raw;
      }
    }
    return raw;
  }, [parentFormData?.database]);

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
  const [modalOpen, setModalOpen] = useState(false);

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

  const handleCreated = useCallback(
    (datasetName: string) => {
      setStubNames(prev =>
        prev.includes(datasetName) ? prev : [...prev, datasetName],
      );
      onChange(datasetName);
    },
    [onChange],
  );

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
            onClick={() => setModalOpen(true)}
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

      <CreateDatasetDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
};
