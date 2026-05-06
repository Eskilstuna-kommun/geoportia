import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Chip,
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { columnViewOptions, tableViewOptions } from '../../utils/columnOptions';

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
  geoportiaOpenStyles
}: Props) => {
  const [viewName, setViewName] = useState(initialValue);
  const [tableKeys, setTableKeys] = useState<string[]>([]);
  const [columnKeys, setColumnKeys] = useState<string[]>([]);

  // Reset fields each time the dialog is opened
  useEffect(() => {
    if (open) {
      setViewName(initialValue);
      setTableKeys([]);
      setColumnKeys([]);
    }
  }, [open, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      viewName,
      Table: tableKeys,
      Columns: columnKeys,
    });
    onClose();
  };

  const tableOptions = tableViewOptions();
  const columnOptions = columnViewOptions();

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
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index }) as {
                  key: React.Key;
                };
                return <Chip key={key} label={option.label} {...tagProps} />;
              })
            }
            renderInput={params => (
              <TextField {...params} label="Table" variant="outlined" />
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
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index }) as {
                  key: React.Key;
                };
                return <Chip key={key} label={option.label} {...tagProps} />;
              })
            }
            renderInput={params => (
              <TextField {...params} label="Column" variant="outlined" />
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
