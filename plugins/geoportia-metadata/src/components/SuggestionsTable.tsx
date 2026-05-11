import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
  makeStyles,
  Paper,
} from '@material-ui/core';
import { Skeleton } from '@material-ui/lab';
import PersonIcon from '@material-ui/icons/Person';
import ScheduleIcon from '@material-ui/icons/Schedule';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geoportiaMetadataTranslationRef } from '../translation';

export interface MetadataSuggestion {
  id: number;
  entityRef: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  suggestedBy: string;
}

export interface SuggestionsTableProps {
  suggestions: MetadataSuggestion[];
  loading?: boolean;
  onRowClick?: (suggestion: MetadataSuggestion) => void;
}

const useStyles = makeStyles(theme => ({
  container: {
    marginTop: theme.spacing(3),
  },
  title: {
    marginBottom: theme.spacing(2),
    fontWeight: 500,
  },
  tableRow: {
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
  chip: {
    marginRight: theme.spacing(1),
  },
  emptyState: {
    padding: theme.spacing(4),
    textAlign: 'center',
    color: theme.palette.text.secondary,
  },
  dateCell: {
    whiteSpace: 'nowrap',
  },
}));

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatUserName = (userRef: string): string => {
  // Extract name from user:default/username format
  const match = userRef.match(/user:[^/]+\/(.+)/);
  return match ? match[1] : userRef;
};

export const SuggestionsTable: React.FC<SuggestionsTableProps> = ({
  suggestions,
  loading = false,
  onRowClick,
}) => {
  const classes = useStyles();
  const { t } = useTranslationRef(geoportiaMetadataTranslationRef);

  if (loading) {
    return (
      <Box className={classes.container}>
        <Typography variant="h6" className={classes.title}>
          {t('suggestionsTable.title')}
        </Typography>
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('suggestionsTable.columns.id')}</TableCell>
                <TableCell>{t('suggestionsTable.columns.suggestedBy')}</TableCell>
                <TableCell>{t('suggestionsTable.columns.date')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[1, 2, 3].map(i => (
                <TableRow key={i}>
                  <TableCell><Skeleton width={40} /></TableCell>
                  <TableCell><Skeleton width={150} /></TableCell>
                  <TableCell><Skeleton width={120} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Box className={classes.container}>
        <Typography variant="h6" className={classes.title}>
          {t('suggestionsTable.title')}
        </Typography>
        <Paper variant="outlined" className={classes.emptyState}>
          <Typography variant="body2">
            {t('suggestionsTable.emptyState')}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box className={classes.container}>
      <Typography variant="h6" className={classes.title}>
        {t('suggestionsTable.title')} ({suggestions.length})
      </Typography>
      <Paper variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('suggestionsTable.columns.id')}</TableCell>
              <TableCell>{t('suggestionsTable.columns.suggestedBy')}</TableCell>
              <TableCell>{t('suggestionsTable.columns.date')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suggestions.map(suggestion => (
              <TableRow
                key={suggestion.id}
                className={classes.tableRow}
                onClick={() => onRowClick?.(suggestion)}
              >
                <TableCell>
                  <Chip
                    label={`#${suggestion.id}`}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <PersonIcon fontSize="small" style={{ marginRight: 8, opacity: 0.6 }} />
                    {formatUserName(suggestion.suggestedBy)}
                  </Box>
                </TableCell>
                <TableCell className={classes.dateCell}>
                  <Box display="flex" alignItems="center">
                    <ScheduleIcon fontSize="small" style={{ marginRight: 8, opacity: 0.6 }} />
                    {formatDate(suggestion.createdAt)}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};
