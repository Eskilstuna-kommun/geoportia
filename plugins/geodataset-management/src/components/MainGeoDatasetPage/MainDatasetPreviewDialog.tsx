import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import CheckIcon from '@material-ui/icons/Check';
import ShieldIcon from '@material-ui/icons/Security';
import PersonIcon from '@material-ui/icons/Person';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../translation';
import { DatasetEntry } from '../../data';

export type MainDatasetPreviewDialogProps = {
  open: boolean;
  entry: DatasetEntry | null;
  onClose: () => void;
};

type JsonSchemaNode = {
  type?: string | string[];
  title?: string;
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode;
  enum?: unknown[];
};

const shieldColor = (level: DatasetEntry['skyddsklass']): string => {
  switch (level) {
    case 'red':
      return '#e53935';
    case 'yellow':
      return '#fb8c00';
    default:
      return '#43a047';
  }
};

const getType = (schema: JsonSchemaNode): string => {
  if (Array.isArray(schema.type)) {
    return schema.type.find(t => t !== 'null') ?? 'string';
  }
  return schema.type ?? 'string';
};

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

const Field = ({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) => {
  if (isEmpty(value)) return null;
  return (
    <TableRow>
      <TableCell
        style={{ fontWeight: 'bold', width: '30%', verticalAlign: 'top' }}
      >
        {label}
      </TableCell>
      <TableCell>{value}</TableCell>
    </TableRow>
  );
};

const renderPrimitive = (
  value: unknown,
  yes: string,
  no: string,
): React.ReactNode => {
  if (typeof value === 'boolean') return value ? yes : no;
  if (Array.isArray(value)) return value.join(', ');
  if (value === undefined || value === null) return undefined;
  return String(value);
};

const ArraySection: React.FC<{
  title: string;
  schema: JsonSchemaNode;
  values: unknown[];
  yes: string;
  no: string;
}> = ({ title, schema, values, yes, no }) => {
  const itemSchema = schema.items;
  if (!itemSchema || !itemSchema.properties) return null;
  const columns = Object.entries(itemSchema.properties);

  return (
    <Box mt={3}>
      <Typography
        variant="subtitle1"
        style={{ fontWeight: 'bold', marginBottom: 8 }}
      >
        {title}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map(([key, sub]) => (
              <TableCell key={key}>{sub.title ?? key}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {values.map((row, i) => {
            const rowObj = (row ?? {}) as Record<string, unknown>;
            return (
              <TableRow key={i}>
                {columns.map(([key]) => (
                  <TableCell key={key}>
                    {renderPrimitive(rowObj[key], yes, no)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};

const ObjectSection: React.FC<{
  title?: string;
  schema: JsonSchemaNode;
  values: Record<string, unknown>;
  yes: string;
  no: string;
  skipKeys?: Set<string>;
}> = ({ title, schema, values, yes, no, skipKeys }) => {
  if (!schema.properties) return null;
  const rows = Object.entries(schema.properties).filter(
    ([key]) => !skipKeys?.has(key),
  );
  if (rows.length === 0) return null;

  return (
    <Box mt={title ? 2 : 0}>
      {title && (
        <Typography
          variant="subtitle1"
          style={{ fontWeight: 'bold', marginBottom: 8 }}
        >
          {title}
        </Typography>
      )}
      <Table size="small">
        <TableBody>
          {rows.map(([key, sub]) => (
            <Field
              key={key}
              label={sub.title ?? key}
              value={renderPrimitive(values[key], yes, no)}
            />
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};


const SchemaSections: React.FC<{
  schema: JsonSchemaNode;
  values: Record<string, unknown>;
  yes: string;
  no: string;
  headerKeys: Set<string>;
}> = ({ schema, values, yes, no, headerKeys }) => {
  if (!schema.properties) return null;
  return (
    <>
      {Object.entries(schema.properties).map(([key, sub]) => {
        const subValue = values[key];
        const subType = getType(sub);

        if (subType === 'object') {
          return (
            <ObjectSection
              key={key}
              title={sub.title ?? key}
              schema={sub}
              values={(subValue as Record<string, unknown>) ?? {}}
              yes={yes}
              no={no}
              skipKeys={headerKeys}
            />
          );
        }

        if (subType === 'array' && Array.isArray(subValue)) {
          return (
            <ArraySection
              key={key}
              title={sub.title ?? key}
              schema={sub}
              values={subValue}
              yes={yes}
              no={no}
            />
          );
        }

        return null;
      })}
    </>
  );
};

export const MainDatasetPreviewDialog = ({
  open,
  entry,
  onClose,
}: MainDatasetPreviewDialogProps) => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);

  if (!entry) return null;

  const yes = t('preview.yes');
  const no = t('preview.no');

  const headerKeys = new Set([
    'title',
    'securityClass',
    'openData',
    'contactPerson',
  ]);

  const schema = entry.schema as JsonSchemaNode | undefined;
  const values = entry.metadataValues ?? {};

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle disableTypography>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{t('preview.title')}</Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h5" style={{ fontWeight: 'bold' }}>
            {entry.titel}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            uuid: <em>{entry.uuid}</em>
          </Typography>
        </Box>

        <Box
          display="flex"
          alignItems="center"
          mb={2}
          style={{ gap: 8, flexWrap: 'wrap' }}
        >
          {entry.protectionClassLabel && (
            <Button
              variant="outlined"
              size="small"
              startIcon={
                <ShieldIcon style={{ color: shieldColor(entry.skyddsklass) }} />
              }
            >
              {t('preview.protectionClass')}: {entry.protectionClassLabel}
            </Button>
          )}
          {entry.oppenData && (
            <Button
              variant="outlined"
              size="small"
              endIcon={<CheckIcon style={{ color: 'green' }} />}
            >
              {t('preview.openData')}
            </Button>
          )}
          <Box flex={1} />
          {entry.contactPerson && entry.contactPerson.length > 0 && (
            <Box
              display="flex"
              alignItems="center"
              style={{ gap: 4, flexWrap: 'wrap' }}
            >
              <PersonIcon fontSize="small" />
              {entry.contactPerson.map(cp => (
                <Chip key={cp} size="small" label={cp} />
              ))}
            </Box>
          )}
        </Box>

        {schema && (
          <SchemaSections
            schema={schema}
            values={values}
            yes={yes}
            no={no}
            headerKeys={headerKeys}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
