import React, { useState, useEffect, useCallback } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import {
  TextField,
  CircularProgress,
  Box,
  Typography,
  makeStyles,
  createStyles,
  Theme,
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    option: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    optionName: {
      fontWeight: 500,
    },
    optionDescription: {
      fontSize: '0.85em',
      color: theme.palette.text.secondary,
    },
  }),
);

interface TableOption {
  entityRef: string;
  name: string;
  title?: string;
  description?: string;
  namespace?: string;
}

export const TableSelectWidget = (props: WidgetProps) => {
  const { id, readonly, disabled, value, onChange } = props;
  const classes = useStyles();
  
  const catalogApi = useApi(catalogApiRef);
  
  const [tables, setTables] = useState<TableOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');

  // Fetch tables from catalog
  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const response = await catalogApi.getEntities({
        filter: { kind: 'Table' },
      });
      
      const tableOptions: TableOption[] = response.items.map((entity: Entity) => ({
        entityRef: stringifyEntityRef(entity),
        name: entity.metadata.name,
        title: entity.metadata.title,
        description: entity.metadata.description,
        namespace: entity.metadata.namespace,
      }));
      
      // Sort by name
      tableOptions.sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name));
      
      setTables(tableOptions);
    } catch (err) {
      console.error('Error fetching tables:', err);
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, [catalogApi]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Get selected option from value
  const getSelectedOption = (): TableOption | null => {
    if (!value) return null;
    
    // Try to find the table in our list
    const found = tables.find(t => 
      t.entityRef === value || 
      t.name === value || 
      t.name.toLowerCase() === value.toLowerCase()
    );
    
    if (found) return found;
    
    // Create a placeholder if not found
    if (value) {
      return {
        entityRef: `table:default/${value}`,
        name: value,
      };
    }
    
    return null;
  };

  const handleChange = (_event: React.ChangeEvent<{}>, newValue: TableOption | null) => {
    // Store the table name (not the full entityRef) for simplicity
    onChange(newValue ? newValue.name : undefined);
  };

  const selectedOption = getSelectedOption();

  return (
    <Autocomplete
      id={id}
      options={tables}
      loading={loading}
      disabled={disabled || readonly}
      value={selectedOption}
      inputValue={inputValue}
      onInputChange={(_event, newInputValue) => setInputValue(newInputValue)}
      onChange={handleChange}
      getOptionLabel={(option) => option.title || option.name}
      getOptionSelected={(option, val) => option.entityRef === val.entityRef || option.name === val.name}
      filterOptions={(options, { inputValue: input }) => {
        const searchLower = input.toLowerCase();
        return options.filter(
          (opt) =>
            opt.name.toLowerCase().includes(searchLower) ||
            (opt.title?.toLowerCase().includes(searchLower)) ||
            (opt.description?.toLowerCase().includes(searchLower))
        );
      }}
      renderOption={(option) => (
        <Box className={classes.option}>
          <Typography className={classes.optionName}>
            {option.title || option.name}
          </Typography>
          {option.description && (
            <Typography className={classes.optionDescription}>
              {option.description}
            </Typography>
          )}
          {!option.title && option.namespace && option.namespace !== 'default' && (
            <Typography className={classes.optionDescription}>
              {option.namespace}/{option.name}
            </Typography>
          )}
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          size="small"
          placeholder="Sök tabell..."
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};
