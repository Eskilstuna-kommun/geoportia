// Schema-driven edit dialog for a single MetadataEntry.
import React, { useEffect, useState } from 'react';
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

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dto, setDto] = useState<MetadataEntryDto | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown>>({});

  const open = Boolean(entry);

  useEffect(() => {
    if (!entry?.entityRef) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDto(null);
    setMetadata({});
    getMetadataEntry({ discoveryApi, fetchApi }, entry.entityRef)
      .then(result => {
        if (cancelled) return;
        setDto(result);
        setMetadata((result.metadata ?? {}) as Record<string, unknown>);
      })
      .catch(err => {
        if (!cancelled) setError(String(err.message ?? err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entry, discoveryApi, fetchApi]);

  const handleSave = async () => {
    if (!entry?.entityRef || !dto) return;
    setSaving(true);
    setError(null);
    try {
      await updateMetadataEntry(
        { discoveryApi, fetchApi },
        entry.entityRef,
        { schema: dto.schema, metadata },
      );
      onSaved(entry, metadata);
      onClose();
    } catch (err: any) {
      setError(String(err.message ?? err));
    } finally {
      setSaving(false);
    }
  };

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
        {loading && <CircularProgress />}
        {error && (
          <div
            style={{ color: 'red', marginBottom: 8, whiteSpace: 'pre-wrap' }}
          >
            {error}
          </div>
        )}
        {!loading && dto && (
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
          onClick={handleSave}
          color="primary"
          variant="contained"
          disabled={saving || loading || !dto}
        >
          {saving ? <CircularProgress size={20} /> : t('edit.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
