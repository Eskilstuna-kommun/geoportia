// Schema-driven edit dialog for a single MetadataEntry.
import React from 'react';
import { useAsync, useAsyncFn } from 'react-use';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@material-ui/core';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../translation';
import { DatasetEntry } from '../../data';
import {
  getMetadataEntry,
  MetadataEntryDto,
  updateMetadataEntry,
} from './metadataApi';
import { JsonSchema, SchemaForm } from './SchemaForm';

export type EditDatasetDialogProps = {
  entry: DatasetEntry | null;
  onClose: () => void;
  /** Called after a successful save with the new metadata. */
  onSaved: (entry: DatasetEntry, metadata: Record<string, unknown>) => void;
};

export const EditDatasetDialog = ({
  entry,
  onClose,
  onSaved,
}: EditDatasetDialogProps) => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);

  const open = Boolean(entry);
  const entityRef = entry?.entityRef;

  // Load the metadata entry whenever the dialog targets a different entity.
  const {
    value: dto,
    loading: dtoLoading,
    error: loadError,
  } = useAsync(async (): Promise<MetadataEntryDto | undefined> => {
    if (!entityRef) return undefined;
    return getMetadataEntry({ discoveryApi, fetchApi }, entityRef);
  }, [entityRef, discoveryApi, fetchApi]);

  // Local edit buffer, seeded from the loaded dto.
  const [metadata, setMetadata] = React.useState<Record<string, unknown>>({});
  React.useEffect(() => {
    setMetadata((dto?.metadata ?? {}) as Record<string, unknown>);
  }, [dto]);

  const [saveState, save] = useAsyncFn(
    async (next: Record<string, unknown>) => {
      if (!entry?.entityRef || !dto) return;
      await updateMetadataEntry(
        { discoveryApi, fetchApi },
        entry.entityRef,
        { schema: dto.schema, metadata: next },
      );
      onSaved(entry, next);
      onClose();
    },
    [entry, dto, discoveryApi, fetchApi, onSaved, onClose],
  );

  const saving = saveState.loading;
  const error =
    saveState.error?.message ?? loadError?.message ?? null;

  return (
    <Dialog
      open={open}
      onClose={() => (saving ? undefined : onClose())}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {t('edit.title', { name: entry?.titel ?? '' })}
      </DialogTitle>
      <DialogContent dividers>
        {dtoLoading && <CircularProgress />}
        {error && (
          <div
            style={{ color: 'red', marginBottom: 8, whiteSpace: 'pre-wrap' }}
          >
            {error}
          </div>
        )}
        {!dtoLoading && dto && (
          <SchemaForm
            schema={dto.schema as JsonSchema}
            value={metadata}
            onChange={next =>
              setMetadata((next ?? {}) as Record<string, unknown>)
            }
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {t('edit.cancel')}
        </Button>
        <Button
          onClick={() => save(metadata)}
          color="primary"
          variant="contained"
          disabled={saving || dtoLoading || !dto}
        >
          {saving ? <CircularProgress size={20} /> : t('edit.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
