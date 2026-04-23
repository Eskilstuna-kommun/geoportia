import React, { useState, useEffect, useCallback } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import {
  TextField,
  Chip,
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
import { Entity, stringifyEntityRef, parseEntityRef } from '@backstage/catalog-model';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    chip: {
      margin: theme.spacing(0.5),
    },
    option: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
    },
    optionName: {
      fontWeight: 500,
    },
    optionEmail: {
      fontSize: '0.85em',
      color: theme.palette.text.secondary,
    },
  }),
);

interface UserOption {
  entityRef: string;
  name: string;
  displayName?: string;
  email?: string;
}

export const UserSearchWidget = (props: WidgetProps) => {
  const { id, readonly, disabled, value, onChange, schema } = props;
  const classes = useStyles();
  
  const catalogApi = useApi(catalogApiRef);
  
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');

  // Determine if this is a multi-select field (array type)
  const isMultiple = schema.type === 'array';

  // Fetch users from catalog
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await catalogApi.getEntities({
        filter: { kind: 'User' },
      });
      
      const userOptions: UserOption[] = response.items.map((entity: Entity) => {
        const profile = entity.spec?.profile as { displayName?: string; email?: string } | undefined;
        return {
          entityRef: stringifyEntityRef(entity),
          name: entity.metadata.name,
          displayName: entity.metadata.title || profile?.displayName,
          email: profile?.email,
        };
      });
      
      setUsers(userOptions);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [catalogApi]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Convert value to selected options
  const getSelectedOptions = (): UserOption[] => {
    if (!value) return [];
    
    const values = isMultiple ? (value as string[]) : [value as string];
    
    return values
      .filter(Boolean)
      .map((v) => {
        // Check if it's already an entity ref or just a name
        const isEntityRef = v.includes(':') && v.includes('/');
        
        // Try to find the user in our list
        const found = users.find(u => 
          u.entityRef === v || 
          u.name === v || 
          u.name.toLowerCase() === v.toLowerCase()
        );
        
        if (found) return found;
        
        // Create a placeholder for users not found in the list
        return {
          entityRef: isEntityRef ? v : `user:default/${v}`,
          name: isEntityRef ? (parseEntityRef(v).name || v) : v,
        };
      });
  };

  const handleChange = (_event: React.ChangeEvent<{}>, newValue: UserOption | UserOption[] | null) => {
    if (isMultiple) {
      const values = (newValue as UserOption[] | null) || [];
      onChange(values.map(v => v.name));
    } else {
      const singleValue = newValue as UserOption | null;
      onChange(singleValue ? singleValue.name : undefined);
    }
  };

  const selectedOptions = getSelectedOptions();

  return (
    <Autocomplete
      id={id}
      multiple={isMultiple}
      options={users}
      loading={loading}
      disabled={disabled || readonly}
      value={isMultiple ? selectedOptions : (selectedOptions[0] || null)}
      inputValue={inputValue}
      onInputChange={(_event, newInputValue) => setInputValue(newInputValue)}
      onChange={handleChange}
      getOptionLabel={(option) => option.displayName || option.name}
      getOptionSelected={(option, value) => option.entityRef === value.entityRef || option.name === value.name}
      filterOptions={(options, { inputValue }) => {
        const searchLower = inputValue.toLowerCase();
        return options.filter(
          (opt) =>
            opt.name.toLowerCase().includes(searchLower) ||
            (opt.displayName?.toLowerCase().includes(searchLower)) ||
            (opt.email?.toLowerCase().includes(searchLower))
        );
      }}
      renderOption={(option) => (
        <Box className={classes.option}>
          <Typography className={classes.optionName}>
            {option.displayName || option.name}
          </Typography>
          {option.email && (
            <Typography className={classes.optionEmail}>
              {option.email}
            </Typography>
          )}
          {!option.displayName && option.name && (
            <Typography className={classes.optionEmail}>
              {option.name}
            </Typography>
          )}
        </Box>
      )}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip
            label={option.displayName || option.name}
            className={classes.chip}
            size="small"
            {...getTagProps({ index })}
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          variant="outlined"
          size="small"
          placeholder={isMultiple ? 'Sök och välj användare...' : 'Sök användare...'}
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
