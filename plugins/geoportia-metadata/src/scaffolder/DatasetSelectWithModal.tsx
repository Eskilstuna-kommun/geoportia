import React, { useState, useCallback, useEffect } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  Input,
  MenuItem,
  Select,
  Switch,
  TextField,
  FormControlLabel,
  Typography,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import { makeStyles } from '@material-ui/core/styles';
import { useApi, configApiRef, fetchApiRef } from '@backstage/core-plugin-api';

const useStyles = makeStyles((theme) => ({
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    width: '100%',
  },
  selectContainer: {
    flex: 1,
  },
  addButton: {
    minWidth: 40,
    width: 40,
    height: 40,
    padding: 0,
    backgroundColor: '#4a4a4a',
    color: 'white',
    '&:hover': {
      backgroundColor: '#333333',
    },
  },
  dialogContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    paddingTop: theme.spacing(2),
  },
  fieldLabel: {
    color: 'rgba(0, 0, 0, 0.54)',
    fontSize: '0.75rem',
    marginBottom: theme.spacing(0.5),
  },
  requiredStar: {
    color: '#f44336',
  },
}));

interface Dataset {
  id: string;
  name: string;
  summary?: string;
  versioning: string;
  allowZValues: boolean;
  status: string;
}

interface NewDatasetFormData {
  name: string;
  summary: string;
  versioning: string;
  allowZValues: boolean;
  status: string;
}

const DEFAULT_FORM_DATA: NewDatasetFormData = {
  name: '',
  summary: '',
  versioning: 'Ej versionerad',
  allowZValues: false,
  status: 'Godkänd',
};

const VERSIONING_OPTIONS = [
  'Ej versionerad',
  'Versionerad',
];

const STATUS_OPTIONS = [
  'Godkänd',
  'Utkast',
  'Under granskning',
  'Avvisad',
];

export const DatasetSelectWithModal = (props: WidgetProps) => {
  const { id, readonly, disabled, value, onChange } = props;
  const classes = useStyles();

  const configApi = useApi(configApiRef);
  const fetchApi = useApi(fetchApiRef);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<NewDatasetFormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backendUrl = configApi.getString('backend.baseUrl');

  // Fetch datasets from the backend
  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApi.fetch(`${backendUrl}/api/geoportia-metadata/datasets`);
      if (!response.ok) {
        throw new Error(`Failed to fetch datasets: ${response.statusText}`);
      }
      const data = await response.json();
      setDatasets(data);
    } catch (err) {
      console.error('Error fetching datasets:', err);
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  }, [backendUrl, fetchApi]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleOpenDialog = useCallback(() => {
    setFormData(DEFAULT_FORM_DATA);
    setError(null);
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogOpen(false);
    setFormData(DEFAULT_FORM_DATA);
    setError(null);
  }, []);

  const handleFormChange = useCallback(
    (field: keyof NewDatasetFormData) =>
      (event: React.ChangeEvent<HTMLInputElement | { value: unknown }>) => {
        const newValue =
          field === 'allowZValues'
            ? (event.target as HTMLInputElement).checked
            : event.target.value;
        setFormData((prev) => ({ ...prev, [field]: newValue }));
      },
    []
  );

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      setError('Namn är obligatoriskt');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetchApi.fetch(`${backendUrl}/api/geoportia-metadata/datasets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          summary: formData.summary || undefined,
          versioning: formData.versioning,
          allowZValues: formData.allowZValues,
          status: formData.status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `Failed to create dataset: ${response.statusText}`);
      }

      const newDataset = await response.json();
      
      // Add the new dataset to the list and select it
      setDatasets((prev) => [...prev, newDataset].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(newDataset.id);
      
      handleCloseDialog();
    } catch (err: any) {
      setError(err.message || 'Ett fel uppstod');
    } finally {
      setSaving(false);
    }
  }, [formData, backendUrl, fetchApi, onChange, handleCloseDialog]);

  const isSaveDisabled = !formData.name.trim() || !formData.status || saving;

  // Build dropdown options from datasets
  const dropdownOptions = [
    { value: '', label: 'Välj...' },
    ...datasets.map((ds) => ({ value: ds.id, label: ds.name })),
  ];

  if (loading) {
    return (
      <Box className={classes.container}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="textSecondary">Laddar datasets...</Typography>
      </Box>
    );
  }

  return (
    <>
      <Box className={classes.container}>
        <FormControl className={classes.selectContainer} variant="standard" disabled={disabled || readonly}>
          <Select
            id={id}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            displayEmpty
            input={<Input />}
          >
            {dropdownOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton
          className={classes.addButton}
          onClick={handleOpenDialog}
          disabled={disabled || readonly}
          title="Skapa nytt dataset"
          size="small"
        >
          <AddIcon />
        </IconButton>
      </Box>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Skapa nytt dataset</DialogTitle>
        <DialogContent className={classes.dialogContent}>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          {/* Namn */}
          <Box>
            <Typography className={classes.fieldLabel}>
              Namn <span className={classes.requiredStar}>*</span>
            </Typography>
            <TextField
              fullWidth
              variant="standard"
              value={formData.name}
              onChange={handleFormChange('name')}
              placeholder="Ange datasetnamn"
              required
              disabled={saving}
            />
          </Box>

          {/* Sammanfattning */}
          <Box>
            <Typography className={classes.fieldLabel}>Sammanfattning</Typography>
            <TextField
              fullWidth
              variant="standard"
              multiline
              rows={3}
              value={formData.summary}
              onChange={handleFormChange('summary')}
              placeholder="Beskrivning av datasetet"
              disabled={saving}
            />
          </Box>

          {/* Versionering */}
          <Box>
            <Typography className={classes.fieldLabel}>
              Versionering <span className={classes.requiredStar}>*</span>
            </Typography>
            <FormControl fullWidth variant="standard" disabled={saving}>
              <Select
                value={formData.versioning}
                onChange={handleFormChange('versioning') as any}
                input={<Input />}
              >
                {VERSIONING_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Tillåt Z-värden */}
          <Box>
            <Typography className={classes.fieldLabel}>
              Tillåt Z-värden <span className={classes.requiredStar}>*</span>
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.allowZValues}
                  onChange={handleFormChange('allowZValues')}
                  color="primary"
                  disabled={saving}
                />
              }
              label=""
            />
          </Box>

          {/* Status */}
          <Box>
            <Typography className={classes.fieldLabel}>
              Status <span className={classes.requiredStar}>*</span>
            </Typography>
            <FormControl fullWidth variant="standard" disabled={saving}>
              <Select
                value={formData.status}
                onChange={handleFormChange('status') as any}
                input={<Input />}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="default" disabled={saving}>
            Avbryt
          </Button>
          <Button
            onClick={handleSave}
            color="primary"
            variant="contained"
            disabled={isSaveDisabled}
          >
            {saving ? <CircularProgress size={20} /> : 'Spara'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
