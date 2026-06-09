import React from 'react';
import type { WidgetProps, EnumOptionsType } from '@rjsf/utils';
import { TextField, FormControl, Select, MenuItem, Checkbox, ListItemText, Chip, Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { DatasetSelectWithModal } from './DatasetSelectWithModal';
import { DatabaseSelectWidget } from './DatabaseSelectWidget';
import { UserSearchWidget } from './UserSearchWidget';
import { TableSelectWidget } from './TableSelectWidget';
import { GroupSearchWidget } from './GroupSearchWidget';

const useMultiSelectStyles = makeStyles((theme) => ({
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(0.5),
  },
  chip: {
    maxWidth: '100%',
  },
  menuItem: {
    whiteSpace: 'normal',
    wordBreak: 'break-word',
  },
}));

export const FullWidthTextWidget = (props: WidgetProps) => {
  const { id, readonly, disabled, value, onChange, onBlur, onFocus, uiSchema } = props;
  const rows = uiSchema?.['ui:options']?.rows as number | undefined;
  const multiline = rows !== undefined && rows > 1;

  return (
    <TextField
      id={id}
      disabled={disabled || readonly}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
      onBlur={(e) => onBlur && onBlur(id, e.target.value)}
      onFocus={(e) => onFocus && onFocus(id, e.target.value)}
      fullWidth
      multiline={multiline}
      rows={rows}
      variant="outlined"
      size="small"
    />
  );
};

export const FullWidthSelectWidget = (props: WidgetProps) => {
  const { id, readonly, disabled, value, onChange, options } = props;
  const enumOptions = options.enumOptions || [];

  return (
    <FormControl fullWidth variant="outlined" size="small" disabled={disabled || readonly}>
      <Select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        displayEmpty
      >
        {enumOptions.map((opt: EnumOptionsType) => (
          <MenuItem key={String(opt.value)} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export const MultiSelectWidget = (props: WidgetProps) => {
  const classes = useMultiSelectStyles();
  const { id, readonly, disabled, value, onChange, options, placeholder } = props;
  const enumOptions = (options.enumOptions || []) as EnumOptionsType[];
  const selectedValues = Array.isArray(value) ? value : [];

  // Create a map for quick lookup of labels
  const labelMap = new Map<string, string>();
  enumOptions.forEach((opt) => {
    labelMap.set(String(opt.value), String(opt.label));
  });

  // Get short label (text before " - ")
  const getShortLabel = (label: string) => {
    const dashIndex = label.indexOf(' - ');
    return dashIndex > 0 ? label.substring(0, dashIndex) : label;
  };

  return (
    <FormControl fullWidth variant="outlined" size="small" disabled={disabled || readonly}>
      <Select
        id={id}
        multiple
        value={selectedValues}
        onChange={(e) => onChange(e.target.value as string[])}
        displayEmpty
        renderValue={(selected) => {
          const selectedArray = selected as string[];
          if (selectedArray.length === 0) {
            return <em>{placeholder || 'Välj...'}</em>;
          }
          return (
            <Box className={classes.chips}>
              {selectedArray.map((val) => (
                <Chip
                  key={val}
                  label={getShortLabel(labelMap.get(val) || val)}
                  size="small"
                  className={classes.chip}
                />
              ))}
            </Box>
          );
        }}
        MenuProps={{
          PaperProps: {
            style: {
              maxHeight: 400,
            },
          },
          anchorOrigin: {
            vertical: 'bottom',
            horizontal: 'left',
          },
          transformOrigin: {
            vertical: 'top',
            horizontal: 'left',
          },
          getContentAnchorEl: null,
        }}
      >
        {enumOptions.map((opt: EnumOptionsType) => (
          <MenuItem key={String(opt.value)} value={opt.value} className={classes.menuItem}>
            <Checkbox checked={selectedValues.includes(opt.value as string)} />
            <ListItemText primary={opt.label} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export const customWidgets = {
  TextWidget: FullWidthTextWidget,
  TextareaWidget: FullWidthTextWidget,
  SelectWidget: FullWidthSelectWidget,
  MultiSelectWidget: MultiSelectWidget,
  DatasetSelectWidget: DatasetSelectWithModal,
  DatabaseSelectWidget: DatabaseSelectWidget,
  UserSearchWidget: UserSearchWidget,
  TableSelectWidget: TableSelectWidget,
  GroupSearchWidget: GroupSearchWidget,
};
