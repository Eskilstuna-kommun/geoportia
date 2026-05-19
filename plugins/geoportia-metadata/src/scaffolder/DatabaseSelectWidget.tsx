import React, { useState, useCallback, useEffect } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import {
  Box,
  CircularProgress,
  FormControl,
  MenuItem,
  Select,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useApi } from '@backstage/core-plugin-api';
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
}));

interface Database {
  id: string;
  name: string;
}

export const DatabaseSelectWidget = (props: WidgetProps) => {
  const { id, readonly, disabled, value, onChange } = props;
  const classes = useStyles();

  const catalogApi = useApi(catalogApiRef);

  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch database resources from the catalog (kind: Resource, spec.type: database)
  const fetchDatabases = useCallback(async () => {
    try {
      setLoading(true);
      const response = await catalogApi.getEntities({
        filter: { kind: 'Resource', 'spec.type': 'database' },
      });
      
      const databaseEntities: Database[] = response.items.map(entity => ({
        id: entity.metadata.name,
        name: (entity.metadata.title || entity.metadata.name) as string,
      }));
      
      setDatabases(databaseEntities.sort((a: Database, b: Database) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error('Error fetching databases:', err);
      setDatabases([]);
    } finally {
      setLoading(false);
    }
  }, [catalogApi]);

  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  // Build dropdown options from databases
  const dropdownOptions = [
    { value: '', label: 'Välj...' },
    ...databases.map((db) => ({ value: db.id, label: db.name })),
  ];

  if (loading) {
    return (
      <Box className={classes.container}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="textSecondary">Laddar databaser...</Typography>
      </Box>
    );
  }

  return (
    <Box className={classes.container}>
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
  );
};
