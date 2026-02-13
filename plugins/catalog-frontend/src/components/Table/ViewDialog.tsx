import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Chip,
  CircularProgress,
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import {
  fetchTables,
  fetchColumns,
} from '../DbFetchComponent/DbFetchComponent';

type Option = { key: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (view: ViewDialogProps) => void;
  initialValue?: string;
  geoportiaOpenStyles: ReturnType<
    typeof import('@internal/geoportia-ui').useGeoportiaOpenStyles
  >;
};

export interface ViewDialogProps {
  viewName: string;
  Table: string[];
  Columns: string[];
}

export const ViewDialog = ({
  open,
  onClose,
  onSubmit,
  initialValue = '',
  geoportiaOpenStyles,
}: Props) => {
  const [viewName, setViewName] = useState(initialValue);
  const [tableKeys, setTableKeys] = useState<string[]>([]);
  const [columnKeys, setColumnKeys] = useState<string[]>([]);

  const [tableOptions, setTableOptions] = useState<Option[]>([]);
  const [columnOptions, setColumnOptions] = useState<Option[]>([]);

  const [tablesLoading, setTablesLoading] = useState(false);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Reset fields each time the dialog is opened
  useEffect(() => {
    if (open) {
      setViewName(initialValue);
      setTableKeys([]);
      setColumnKeys([]);
      setLoadError(null);
    }
  }, [open, initialValue]);

  // Fetch tables when dialog opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      try {
        setTablesLoading(true);
        setLoadError(null);

        const tables = (await fetchTables("public")).tables ?? [];

        if (!cancelled) setTableOptions(
          tables.map(table => ({ key: table, label: table })),
        );
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message ?? 'Failed to load tables');
      } finally {
        if (!cancelled) setTablesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Fetch columns when selected tables change (or if your API needs only one table, use tableKeys[0])
  useEffect(() => {
    if (!open) return;

    // common UX: no tables selected => clear columns
    if (tableKeys.length === 0) {
      setColumnOptions([]);
      setColumnKeys([]);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setColumnsLoading(true);
        setLoadError(null);

        let allCols: Option[] = [];

        for (const table of tableKeys) {
          const cols = (await fetchColumns("public", table)).columns ?? [];

          console.log(`Fetched columns for ${table}:`, JSON.stringify(cols));

          allCols = allCols.concat(cols.map(col => ({
            key: `${table}.${col}`,
            label: `${table}.${col}`,
          })));
        }

        if (!cancelled) setColumnOptions(allCols);

        // Optional: drop selected columns that are no longer valid
        if (!cancelled) {
          const valid = new Set(allCols.map(c => c.key));
          setColumnKeys(prev => prev.filter(k => valid.has(k)));
        }
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message ?? 'Failed to load columns');
      } finally {
        if (!cancelled) setColumnsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, tableKeys]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      viewName,
      Table: tableKeys,
      Columns: columnKeys,
    });
    onClose();
  };

  return (
    <Dialog open={open} fullWidth maxWidth="sm" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Lägg till vy</DialogTitle>

        <DialogContent className={geoportiaOpenStyles.dialogContent}>
          <TextField
            autoFocus
            margin="dense"
            label="VyNamn"
            type="text"
            fullWidth
            variant="outlined"
            value={viewName}
            onChange={e => setViewName(e.target.value)}
          />

          <Autocomplete
            multiple
            options={tableOptions}
            getOptionLabel={option => option.label}
            value={tableOptions.filter(opt => tableKeys.includes(opt.key))}
            onChange={(_, newValue) =>
              setTableKeys(newValue.map(opt => opt.key))
            }
            loading={tablesLoading}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index }) as {
                  key: React.Key;
                };
                return <Chip key={key} label={option.label} {...tagProps} />;
              })
            }
            renderInput={params => (
              <TextField
                {...params}
                label="Table"
                variant="outlined"
                helperText={loadError ?? ''}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {tablesLoading ? (
                        <CircularProgress color="inherit" size={18} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          <Autocomplete
            multiple
            options={columnOptions}
            getOptionLabel={option => option.label}
            value={columnOptions.filter(opt => columnKeys.includes(opt.key))}
            onChange={(_, newValue) =>
              setColumnKeys(newValue.map(opt => opt.key))
            }
            loading={columnsLoading}
            disabled={tableKeys.length === 0}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index }) as {
                  key: React.Key;
                };
                return <Chip key={key} label={option.label} {...tagProps} />;
              })
            }
            renderInput={params => (
              <TextField
                {...params}
                label="Column"
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {columnsLoading ? (
                        <CircularProgress color="inherit" size={18} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} color="primary">
            Avbryt
          </Button>
          <Button type="submit" color="primary" variant="contained">
            Spara
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
