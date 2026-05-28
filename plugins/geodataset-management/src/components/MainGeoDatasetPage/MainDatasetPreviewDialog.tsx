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

const Field = ({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) => {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return null;
  }
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

export const MainDatasetPreviewDialog = ({
  open,
  entry,
  onClose,
}: MainDatasetPreviewDialogProps) => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);

  if (!entry) return null;

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

        <Table size="small">
          <TableBody>
            <Field label={t('preview.status')} value={entry.status} />
            <Field label={t('preview.layerName')} value={entry.layerName} />
            <Field
              label={t('preview.suggestedTitle')}
              value={entry.suggestedTitle}
            />
            <Field label={t('preview.summary')} value={entry.sammanfattning} />
            <Field label={t('preview.dataType')} value={entry.dataType} />
            <Field label={t('preview.database')} value={entry.database} />
            <Field label={t('preview.dataset')} value={entry.dataset} />
            <Field
              label={t('preview.allowAttachments')}
              value={
                entry.allowAttachments === undefined
                  ? undefined
                  : entry.allowAttachments
                  ? t('preview.yes')
                  : t('preview.no')
              }
            />
            <Field label={t('preview.owner')} value={entry.owner} />
            <Field
              label={t('preview.adminRoutine')}
              value={entry.adminRoutine}
            />
            <Field
              label={t('preview.maintenanceFrequency')}
              value={entry.maintenanceFrequency}
            />
            <Field label={t('preview.subjectArea')} value={entry.subjectArea} />
            <Field
              label={t('preview.originHistory')}
              value={entry.originHistory}
            />
            <Field label={t('preview.source')} value={entry.source} />
            <Field label={t('preview.quality')} value={entry.quality} />
            <Field
              label={t('preview.dataCollectionMethod')}
              value={entry.dataCollectionMethod}
            />
            <Field
              label={t('preview.processingMethod')}
              value={entry.processingMethod}
            />
            <Field
              label={t('preview.boundingBoxType')}
              value={entry.boundingBoxType}
            />
            <Field
              label={t('preview.datasetStatus')}
              value={entry.datasetStatus}
            />
          </TableBody>
        </Table>

        {entry.attributes && entry.attributes.length > 0 && (
          <Box mt={3}>
            <Typography
              variant="subtitle1"
              style={{ fontWeight: 'bold', marginBottom: 8 }}
            >
              {t('preview.attributes')}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('preview.attrName')}</TableCell>
                  <TableCell>{t('preview.attrAlias')}</TableCell>
                  <TableCell>{t('preview.attrDataFormat')}</TableCell>
                  <TableCell>{t('preview.attrLength')}</TableCell>
                  <TableCell>{t('preview.attrSecurityClass')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entry.attributes.map((a, i) => (
                  <TableRow key={`${a.name ?? 'attr'}-${i}`}>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>{a.alias}</TableCell>
                    <TableCell>{a.dataFormat}</TableCell>
                    <TableCell>{a.length}</TableCell>
                    <TableCell>{a.securityClass}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
