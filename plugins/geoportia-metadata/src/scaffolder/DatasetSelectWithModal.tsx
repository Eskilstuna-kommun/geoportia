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
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import { makeStyles } from '@material-ui/core/styles';
import { useApi, discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';

const useStyles = makeStyles((theme) => ({
  container: {
    display: 'flex',
    gap: theme.spacing(1),
    width: '100%',
    flexDirection: 'column',
  },
  selectContainer: {
    flex: 1,
  },
  createButton: {
    whiteSpace: 'nowrap',
    width: 'fit-content',
  },
  buttonContainer:{
    width: '100%',
    display: 'flex',
    flexDirection: 'row-reverse',
  }
}));

interface Dataset {
  id: string;
  name: string;
}

export const DatasetSelectWithModal = (props: WidgetProps) => {
  const { id, readonly, disabled, value, onChange } = props;
  const classes = useStyles();

  const catalogApi = useApi(catalogApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetSummary, setNewDatasetSummary] = useState('');
  const [newDatasetVersioning, setNewDatasetVersioning] = useState('');
  const [newDatasetAllowZValues, setNewDatasetAllowZValues] = useState(false);
  const [newDatasetStatus, setNewDatasetStatus] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch datasets from the catalog
  const fetchDatasets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await catalogApi.getEntities({
        filter: { kind: 'Dataset' },
      });
      
      const datasetEntities: Dataset[] = response.items.map(entity => ({
        id: entity.metadata.name,
        name: (entity.metadata.title || entity.metadata.name) as string,
      }));
      
      setDatasets(datasetEntities.sort((a: Dataset, b: Dataset) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Error fetching datasets:', err);
      setDatasets([]);
    } finally {
      setLoading(false);
    }
  }, [catalogApi]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleOpenModal = () => {
    setNewDatasetName('');
    setNewDatasetSummary('');
    setNewDatasetVersioning('');
    setNewDatasetAllowZValues(false);
    setNewDatasetStatus('');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setNewDatasetName('');
    setNewDatasetSummary('');
    setNewDatasetVersioning('');
    setNewDatasetAllowZValues(false);
    setNewDatasetStatus('');
  };

  const handleCreateDataset = async () => {
    if (!newDatasetName.trim() || !newDatasetVersioning || !newDatasetStatus) return;

    try {
      setCreating(true);
      
      // Call the backend to create the dataset
      const baseUrl = await discoveryApi.getBaseUrl('geoportia-metadata');
      const response = await fetchApi.fetch(`${baseUrl}/datasets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newDatasetName.trim(),
          summary: newDatasetSummary.trim() || undefined,
          versioning: newDatasetVersioning,
          allowZValues: newDatasetAllowZValues,
          status: newDatasetStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 409 && errorData.dataset) {
          // Dataset already exists, just select it
          onChange(errorData.dataset.name);
          handleCloseModal();
          return;
        }
        throw new Error(`Failed to create dataset: ${response.status}`);
      }

      const createdDataset = await response.json();
      
      // Refresh and select the new dataset
      await fetchDatasets();
      onChange(createdDataset.name);
      handleCloseModal();
    } catch (err) {
      console.error('Error creating dataset:', err);
    } finally {
      setCreating(false);
    }
  };

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
        <div className={classes.buttonContainer}>
          <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleOpenModal}
            disabled={disabled || readonly}
            className={classes.createButton}
          >
            Skapa nytt dataset
          </Button>
        </div>
        <FormControl className={classes.selectContainer} variant="outlined" size="small" disabled={disabled || readonly}>
          <Select
            id={id}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            displayEmpty
          >
            {dropdownOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>Skapa nytt dataset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            required
            margin="dense"
            label="Namn"
            placeholder="Ange ett namn på dataset"
            fullWidth
            variant="outlined"
            value={newDatasetName}
            onChange={(e) => setNewDatasetName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Sammanfattning"
            placeholder="Ange en sammanfattning"
            fullWidth
            variant="outlined"
            value={newDatasetSummary}
            onChange={(e) => setNewDatasetSummary(e.target.value)}
          />
          <FormControl variant="outlined" fullWidth margin="dense" required>
            <InputLabel>Versionering</InputLabel>
            <Select
              value={newDatasetVersioning}
              onChange={(e) => setNewDatasetVersioning(e.target.value as string)}
              label="Versionering"
            >
              <MenuItem value="">Välj...</MenuItem>
              <MenuItem value="Ej versionerad">Ej versionerad</MenuItem>
              <MenuItem value="Traditionell versionerad">Traditionell versionerad</MenuItem>
              <MenuItem value="Branch-versionerad">Branch-versionerad</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={newDatasetAllowZValues}
                onChange={(e) => setNewDatasetAllowZValues(e.target.checked)}
                color="primary"
              />
            }
            label="Tillåt Z-värden *"
            style={{ marginTop: 8, marginBottom: 8 }}
          />
          <FormControl variant="outlined" fullWidth margin="dense" required>
            <InputLabel>Status</InputLabel>
            <Select
              value={newDatasetStatus}
              onChange={(e) => setNewDatasetStatus(e.target.value as string)}
              label="Status"
            >
              <MenuItem value="">Välj...</MenuItem>
              <MenuItem value="Ska sättas">Ska sättas</MenuItem>
              <MenuItem value="Raderad">Raderad</MenuItem>
              <MenuItem value="Förslagen">Förslagen</MenuItem>
              <MenuItem value="Godkänd">Godkänd</MenuItem>
              <MenuItem value="Ska avpubliceras">Ska avpubliceras</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} disabled={creating}>
            Avbryt
          </Button>
          <Button
            onClick={handleCreateDataset}
            color="primary"
            variant="contained"
            disabled={!newDatasetName.trim() || !newDatasetVersioning || !newDatasetStatus || creating}
          >
            {creating ? <CircularProgress size={20} /> : 'Skapa'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
