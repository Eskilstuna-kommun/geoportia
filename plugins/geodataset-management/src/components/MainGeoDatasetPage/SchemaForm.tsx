import React from 'react';
import {
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
  Box,
} from '@material-ui/core';
import { DISCRIMINATOR_MAPPINGS } from '../../config';

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
  dependencies?: Record<
    string,
    {
      oneOf?: Array<{
        properties?: Record<string, JsonSchema & { enum?: unknown[] }>;
      }>;
    }
  >;
};

const getType = (schema: JsonSchema): string => {
  if (Array.isArray(schema.type)) {
    return schema.type.find(t => t !== 'null') ?? 'string';
  }
  return schema.type ?? 'string';
};

const resolveDependencyBranch = (
  dep: { oneOf?: Array<{ properties?: Record<string, JsonSchema & { enum?: unknown[] }> }> },
  discriminatorKey: string,
  currentValue: unknown,
): Record<string, JsonSchema> => {
  const branches = dep.oneOf ?? [];
  for (const branch of branches) {
    const discriminator = branch.properties?.[discriminatorKey];
    const allowed = discriminator?.enum;
    if (!Array.isArray(allowed)) continue;
    if (!allowed.includes(currentValue)) continue;
    // Found the matching branch — return the *extra* properties it adds.
    const extras: Record<string, JsonSchema> = {};
    for (const [k, v] of Object.entries(branch.properties ?? {})) {
      if (k === discriminatorKey) continue;
      extras[k] = v;
    }
    return extras;
  }
  return {};
};


const legacyHiddenKeys = (
  properties: Record<string, JsonSchema>,
  obj: JsonObject,
): Set<string> => {
  const hidden = new Set<string>();
  for (const [discriminatorKey, branchMap] of Object.entries(DISCRIMINATOR_MAPPINGS)) {
    if (!(discriminatorKey in properties)) continue;
    const selected = obj[discriminatorKey];
    const activeKey =
      typeof selected === 'string' ? branchMap[selected] : undefined;
    for (const subsectionKey of Object.values(branchMap)) {
      if (subsectionKey === activeKey) continue;
      if (subsectionKey in properties) hidden.add(subsectionKey);
    }
  }
  return hidden;
};

export const SchemaForm: React.FC<{
  schema: JsonSchema;
  value: unknown;
  onChange: (next: unknown) => void;
  level?: number;
}> = ({ schema, value, onChange, level = 0 }) => {
  const type = getType(schema);

  if (type === 'object' && schema.properties) {
    const obj = (value as JsonObject) ?? {};

    const extras: Record<string, JsonSchema> = {};
    if (schema.dependencies) {
      for (const [discriminatorKey, dep] of Object.entries(schema.dependencies)) {
        const currentValue = obj[discriminatorKey];
        Object.assign(extras, resolveDependencyBranch(dep, discriminatorKey, currentValue));
      }
    }

    // Hide inactive subsections from legacy (pre-`dependencies`) schemas.
    const hidden = legacyHiddenKeys(schema.properties, obj);

    const allEntries: Array<[string, JsonSchema]> = [
      ...Object.entries(schema.properties).filter(([key]) => !hidden.has(key)),
      ...Object.entries(extras),
    ];

    return (
      <Box ml={level === 0 ? 0 : 2} mt={level === 0 ? 0 : 1}>
        {schema.title && level > 0 && (
          <Typography variant="subtitle1" style={{ marginTop: 8 }}>
            {schema.title}
          </Typography>
        )}
        {allEntries.map(([key, sub]) => (
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
