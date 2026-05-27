import React, { useState, useCallback } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  CircularProgress,
  makeStyles,
  Divider,
  Paper,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import CloseIcon from '@material-ui/icons/Close';
import CheckIcon from '@material-ui/icons/Check';
import PersonIcon from '@material-ui/icons/Person';
import ScheduleIcon from '@material-ui/icons/Schedule';
import { useApi } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geoportiaMetadataTranslationRef } from '../translation';
import { metadataApiRef } from '../client';
import type { MetadataSuggestion } from './SuggestionsTable';

export interface SuggestionDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  suggestion: MetadataSuggestion | null;
  currentMetadata: Record<string, unknown>;
  schema: Record<string, unknown>;
  entityRef: string;
  onAccepted?: () => void;
}

interface FieldComparison {
  field: string;
  fieldTitle: string;
  before: unknown;
  after: unknown;
  changed: boolean;
}

const useStyles = makeStyles(theme => ({
  drawer: {
    width: 700,
    maxWidth: '90vw',
  },
  header: {
    padding: theme.spacing(2, 3),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  content: {
    padding: theme.spacing(3),
    overflowY: 'auto',
    flex: 1,
  },
  footer: {
    padding: theme.spacing(2, 3),
    borderTop: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    justifyContent: 'flex-end',
    gap: theme.spacing(2),
  },
  infoChips: {
    display: 'flex',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(3),
  },
  tableContainer: {
    marginTop: theme.spacing(2),
  },
  changedRow: {
    backgroundColor: theme.palette.warning.light + '20',
    '& td': {
      fontWeight: 500,
    },
  },
  unchangedRow: {
    opacity: 0.7,
  },
  fieldCell: {
    fontWeight: 500,
    minWidth: 150,
  },
  valueCell: {
    maxWidth: 200,
    wordBreak: 'break-word',
  },
  changedBadge: {
    marginLeft: theme.spacing(1),
  },
  emptyValue: {
    color: theme.palette.text.disabled,
    fontStyle: 'italic',
  },
  errorAlert: {
    marginBottom: theme.spacing(2),
  },
}));

interface FormatValueOptions {
  emptyValue: string;
  emptyList: string;
  booleanYes: string;
  booleanNo: string;
}

const formatValue = (value: unknown, options: FormatValueOptions): string => {
  if (value === null || value === undefined || value === '') {
    return options.emptyValue;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return options.emptyList;
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === 'boolean') {
    return value ? options.booleanYes : options.booleanNo;
  }
  return String(value);
};

const isValueEmpty = (value: unknown): boolean => {
  return value === null || value === undefined || value === '' || 
    (Array.isArray(value) && value.length === 0);
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatUserName = (userRef: string): string => {
  const match = userRef.match(/user:[^/]+\/(.+)/);
  return match ? match[1] : userRef;
};

const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (a === undefined || b === undefined) return a === b;
  if (typeof a !== typeof b) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(key => deepEqual(aObj[key], bObj[key]));
  }
  
  return false;
};

export const SuggestionDetailDrawer: React.FC<SuggestionDetailDrawerProps> = ({
  open,
  onClose,
  suggestion,
  currentMetadata,
  schema,
  entityRef,
  onAccepted,
}) => {
  const classes = useStyles();
  const metadataApi = useApi(metadataApiRef);
  const { t } = useTranslationRef(geoportiaMetadataTranslationRef);
  
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format value options using translations
  const formatOptions: FormatValueOptions = {
    emptyValue: t('suggestionDetail.emptyValue'),
    emptyList: t('suggestionDetail.emptyList'),
    booleanYes: t('suggestionDetail.booleanYes'),
    booleanNo: t('suggestionDetail.booleanNo'),
  };

  // Build field comparisons
  const comparisons: FieldComparison[] = React.useMemo(() => {
    if (!suggestion) return [];
    
    const schemaProperties = (schema.properties || {}) as Record<string, { title?: string }>;
    const allFields = new Set([
      ...Object.keys(currentMetadata || {}),
      ...Object.keys(suggestion.metadata || {}),
    ]);
    
    return Array.from(allFields).map(field => {
      const before = currentMetadata?.[field];
      const after = suggestion.metadata?.[field];
      const fieldTitle = schemaProperties[field]?.title || field;
      
      return {
        field,
        fieldTitle,
        before,
        after,
        changed: !deepEqual(before, after),
      };
    }).sort((a, b) => {
      // Show changed fields first
      if (a.changed !== b.changed) return a.changed ? -1 : 1;
      return a.fieldTitle.localeCompare(b.fieldTitle, 'sv');
    });
  }, [suggestion, currentMetadata, schema]);

  const changedCount = comparisons.filter(c => c.changed).length;

  const handleAccept = useCallback(async () => {
    if (!suggestion) return;

    setAccepting(true);
    setError(null);

    try {
      const response = await metadataApi.acceptSuggestion({
        path: {
          entityRef: encodeURIComponent(entityRef),
          id: suggestion.id,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: { message?: string } })?.error?.message ||
            `${t('common.error')}: ${response.statusText}`,
        );
      }

      onClose();
      onAccepted?.();
    } catch (err: any) {
      setError(err?.message || t('suggestionDetail.acceptError'));
    } finally {
      setAccepting(false);
    }
  }, [suggestion, entityRef, metadataApi, onClose, onAccepted, t]);

  if (!suggestion) return null;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ className: classes.drawer }}
    >
      <Box className={classes.header}>
        <Box>
          <Typography variant="h6">
            {t('suggestionDetail.title')} #{suggestion.id}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box className={classes.content}>
        {error && (
          <Alert severity="error" className={classes.errorAlert} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box className={classes.infoChips}>
          <Chip
            icon={<PersonIcon />}
            label={formatUserName(suggestion.suggestedBy)}
            variant="outlined"
            size="small"
          />
          <Chip
            icon={<ScheduleIcon />}
            label={formatDate(suggestion.createdAt)}
            variant="outlined"
            size="small"
          />
          {changedCount > 0 && (
            <Chip
              label={`${changedCount} ${t('suggestionDetail.changedFields')}`}
              color="primary"
              size="small"
            />
          )}
        </Box>

        <Divider />

        <Typography variant="subtitle1" style={{ marginTop: 16, marginBottom: 8 }}>
          {t('suggestionDetail.fieldComparison')}
        </Typography>

        <Paper variant="outlined" className={classes.tableContainer}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell className={classes.fieldCell}>{t('suggestionDetail.columns.field')}</TableCell>
                <TableCell className={classes.valueCell}>{t('suggestionDetail.columns.current')}</TableCell>
                <TableCell className={classes.valueCell}>{t('suggestionDetail.columns.suggested')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {comparisons.map(comparison => (
                <TableRow 
                  key={comparison.field}
                  className={comparison.changed ? classes.changedRow : classes.unchangedRow}
                >
                  <TableCell className={classes.fieldCell}>
                    {comparison.fieldTitle}
                    {comparison.changed && (
                      <Chip
                        label={t('suggestionDetail.changedBadge')}
                        size="small"
                        color="secondary"
                        className={classes.changedBadge}
                      />
                    )}
                  </TableCell>
                  <TableCell className={classes.valueCell}>
                    <span className={isValueEmpty(comparison.before) ? classes.emptyValue : undefined}>
                      {formatValue(comparison.before, formatOptions)}
                    </span>
                  </TableCell>
                  <TableCell className={classes.valueCell}>
                    <span className={isValueEmpty(comparison.after) ? classes.emptyValue : undefined}>
                      {formatValue(comparison.after, formatOptions)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      <Box className={classes.footer}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={accepting}
        >
          {t('suggestionDetail.buttons.close')}
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={accepting ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
          onClick={handleAccept}
          disabled={accepting || changedCount === 0}
        >
          {t('suggestionDetail.buttons.accept')}
        </Button>
      </Box>
    </Drawer>
  );
};
