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
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  Entity,
  stringifyEntityRef,
  parseEntityRef,
} from '@backstage/catalog-model';
import { geoportiaMetadataTranslationRef } from '../translation';

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
    optionMeta: {
      fontSize: '0.85em',
      color: theme.palette.text.secondary,
    },
  }),
);

interface GroupOption {
  entityRef: string;
  name: string;
  displayName?: string;
  description?: string;
}

export const GroupSearchWidget = (props: WidgetProps) => {
  const { id, readonly, disabled, value, onChange, schema } = props;
  const classes = useStyles();
  const { t } = useTranslationRef(geoportiaMetadataTranslationRef);

  const catalogApi = useApi(catalogApiRef);

  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');

  // Determine if this is a multi-select field (array type)
  const isMultiple = schema.type === 'array';

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await catalogApi.getEntities({
        filter: { kind: 'Group' },
      });

      const groupOptions: GroupOption[] = response.items.map(
        (entity: Entity) => {
          const profile = entity.spec?.profile as
            | { displayName?: string }
            | undefined;
          return {
            entityRef: stringifyEntityRef(entity),
            name: entity.metadata.name,
            displayName: entity.metadata.title || profile?.displayName,
            description: entity.metadata.description,
          };
        },
      );

      setGroups(groupOptions);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [catalogApi]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const getSelectedOptions = (): GroupOption[] => {
    if (!value) return [];

    const values = isMultiple ? (value as string[]) : [value as string];

    return values.filter(Boolean).map(v => {
      const isEntityRef = v.includes(':') && v.includes('/');

      const found = groups.find(
        g =>
          g.entityRef === v ||
          g.name === v ||
          g.name.toLowerCase() === v.toLowerCase(),
      );

      if (found) return found;

      return {
        entityRef: isEntityRef ? v : `group:default/${v}`,
        name: isEntityRef ? parseEntityRef(v).name || v : v,
      };
    });
  };

  const handleChange = (
    _event: React.ChangeEvent<{}>,
    newValue: GroupOption | GroupOption[] | null,
  ) => {
    if (isMultiple) {
      const values = (newValue as GroupOption[] | null) || [];
      onChange(values.map(v => v.name));
    } else {
      const singleValue = newValue as GroupOption | null;
      onChange(singleValue ? singleValue.name : undefined);
    }
  };

  const selectedOptions = getSelectedOptions();

  const placeholder = isMultiple
    ? t('scaffolder.groupSelect.placeholderMultiple')
    : t('scaffolder.groupSelect.placeholder');

  return (
    <Autocomplete
      id={id}
      multiple={isMultiple}
      options={groups}
      loading={loading}
      disabled={disabled || readonly}
      value={isMultiple ? selectedOptions : selectedOptions[0] || null}
      inputValue={inputValue}
      onInputChange={(_event, newInputValue) => setInputValue(newInputValue)}
      onChange={handleChange}
      getOptionLabel={option => option.displayName || option.name}
      getOptionSelected={(option, v) =>
        option.entityRef === v.entityRef || option.name === v.name
      }
      filterOptions={(options, { inputValue: input }) => {
        const searchLower = input.toLowerCase();
        return options.filter(
          opt =>
            opt.name.toLowerCase().includes(searchLower) ||
            opt.displayName?.toLowerCase().includes(searchLower) ||
            opt.description?.toLowerCase().includes(searchLower),
        );
      }}
      renderOption={option => (
        <Box className={classes.option}>
          <Typography className={classes.optionName}>
            {option.displayName || option.name}
          </Typography>
          {option.description && (
            <Typography className={classes.optionMeta}>
              {option.description}
            </Typography>
          )}
          {!option.displayName && option.name && (
            <Typography className={classes.optionMeta}>
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
      renderInput={params => (
        <TextField
          {...params}
          variant="outlined"
          size="small"
          placeholder={placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};
