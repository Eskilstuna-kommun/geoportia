import React from 'react';
import type { WidgetProps } from '@rjsf/utils';
import { TextField, FormControl, Select, MenuItem, Input } from '@material-ui/core';

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
      variant="standard"
    />
  );
};

export const FullWidthSelectWidget = (props: WidgetProps) => {
  const { id, readonly, disabled, value, onChange, options } = props;
  const enumOptions = options.enumOptions || [];

  return (
    <FormControl fullWidth variant="standard" disabled={disabled || readonly}>
      <Select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        displayEmpty
        input={<Input />}
      >
        {enumOptions.map((opt: { value: any; label: string }) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
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
};
