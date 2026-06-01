import React from 'react';
import {
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
  Box,
} from '@material-ui/core';

type JsonObject = Record<string, unknown>;

export type JsonSchema = {
  type?: string | string[];
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  enum?: unknown[];
  items?: JsonSchema;
  format?: string;
};

const getType = (schema: JsonSchema): string => {
  if (Array.isArray(schema.type)) {
    return schema.type.find(t => t !== 'null') ?? 'string';
  }
  return schema.type ?? 'string';
};

/**
 * Render a small set of plain Material-UI inputs from a JSON schema.
 * Object properties get a section heading + recursive render.
 * Anything we can't handle (arrays of objects, oneOf/anyOf, …) is shown
 * read-only as JSON so the user knows it's there but isn't editable here.
 */
export const SchemaForm: React.FC<{
  schema: JsonSchema;
  value: unknown;
  onChange: (next: unknown) => void;
  level?: number;
}> = ({ schema, value, onChange, level = 0 }) => {
  const type = getType(schema);

  if (type === 'object' && schema.properties) {
    const obj = (value as JsonObject) ?? {};
    return (
      <Box ml={level === 0 ? 0 : 2} mt={level === 0 ? 0 : 1}>
        {schema.title && level > 0 && (
          <Typography variant="subtitle1" style={{ marginTop: 8 }}>
            {schema.title}
          </Typography>
        )}
        {Object.entries(schema.properties).map(([key, sub]) => (
          <SchemaForm
            key={key}
            schema={{ ...sub, title: sub.title ?? key }}
            value={obj[key]}
            onChange={next => onChange({ ...obj, [key]: next })}
            level={level + 1}
          />
        ))}
      </Box>
    );
  }

  const label = schema.title ?? '';

  if (type === 'boolean') {
    return (
      <Box mt={1}>
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(value)}
              onChange={e => onChange(e.target.checked)}
            />
          }
          label={label}
        />
      </Box>
    );
  }

  if (Array.isArray(schema.enum)) {
    return (
      <TextField
        select
        label={label}
        fullWidth
        margin="normal"
        value={value == null ? '' : String(value)}
        onChange={e => onChange(e.target.value)}
      >
        <MenuItem value="">—</MenuItem>
        {schema.enum.map(opt => (
          <MenuItem key={String(opt)} value={String(opt)}>
            {String(opt)}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (type === 'number' || type === 'integer') {
    return (
      <TextField
        type="number"
        label={label}
        fullWidth
        margin="normal"
        value={value == null ? '' : String(value)}
        onChange={e => {
          const n = e.target.value === '' ? undefined : Number(e.target.value);
          onChange(n);
        }}
      />
    );
  }

  if (type === 'string') {
    const stringValue = value == null ? '' : String(value);
    const multiline = stringValue.length > 60 || schema.format === 'textarea';
    return (
      <TextField
        label={label}
        fullWidth
        margin="normal"
        multiline={multiline}
        minRows={multiline ? 2 : undefined}
        value={stringValue}
        onChange={e => onChange(e.target.value)}
      />
    );
  }

  // Fallback: read-only JSON preview for things we don't render (arrays,
  // unions, etc.). The value is preserved untouched on save.
  return (
    <Box mt={1}>
      <Typography variant="caption" color="textSecondary">
        {label} (read-only)
      </Typography>
      <Box
        component="pre"
        style={{
          background: 'rgba(0,0,0,0.04)',
          padding: 8,
          fontSize: 12,
          maxHeight: 120,
          overflow: 'auto',
        }}
      >
        {JSON.stringify(value, null, 2)}
      </Box>
    </Box>
  );
};
