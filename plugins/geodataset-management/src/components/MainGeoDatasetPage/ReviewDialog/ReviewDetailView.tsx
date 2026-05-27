import React, { useState } from 'react';
import {
  Box,
  Button,
  ClickAwayListener,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@material-ui/core';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import PersonIcon from '@mui/icons-material/Person';
import PlaceIcon from '@mui/icons-material/Place';
import ShieldIcon from '@mui/icons-material/Shield';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../../translation';
import { ReviewItem } from '../../../data';

type Props = {
  item: ReviewItem;
};

export const ReviewDetailView = ({ item }: Props) => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  const [contactOpen, setContactOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Extract user name from suggestedBy (e.g. "user:default/anders.andersson" -> "anders.andersson")
  const suggestedByName = item.suggestedBy?.split('/').pop() ?? '';
  // Create initials from the name (e.g. "anders.andersson" -> "AA")
  const initials = suggestedByName
    .split(/[.\-_]/)
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  const toggleRow = (key: string) =>
    setExpandedRows(prev => ({ ...prev, [key]: !prev[key] }));

  const expandableRows = [
    {
      key: 'fieldReadPermission',
      label: t('reviewDialog.fieldReadPermission'),
      value: t('reviewDialog.fieldReadPermissionValue'),
    },
    {
      key: 'fieldEditPermission',
      label: t('reviewDialog.fieldEditPermission'),
      value: t('reviewDialog.fieldEditPermissionValue'),
    },
    {
      key: 'fieldAttributes',
      label: t('reviewDialog.fieldAttributes'),
      value: t('reviewDialog.fieldAttributesValue'),
    },
    {
      key: 'fieldAttachments',
      label: t('reviewDialog.fieldAttachments'),
      value: t('reviewDialog.fieldAttachmentsValue'),
    },
    {
      key: 'fieldLinkedLayers',
      label: t('reviewDialog.fieldLinkedLayers'),
      value: t('reviewDialog.fieldLinkedLayersValue'),
    },
  ];

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h5" style={{ fontWeight: 'bold' }}>
          {item.title}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          uuid: <em>{item.uuid}</em>
        </Typography>
      </Box>

      <Box display="flex" alignItems="center" mb={2} style={{ gap: 8 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ShieldIcon style={{ color: 'green' }} />}
        >
          {t('reviewDialog.protectionClassLabel')}: {item.protectionClass}
        </Button>
        {item.openData && (
          <Button
            variant="outlined"
            size="small"
            endIcon={<CheckIcon style={{ color: 'green' }} />}
          >
            {t('reviewDialog.openData')}
          </Button>
        )}
        <Box flex={1} />
        <Box position="relative">
          <Button
            variant="outlined"
            size="small"
            startIcon={<PersonIcon />}
            onClick={() => setContactOpen(o => !o)}
          >
            {t('reviewDialog.contactPerson')}
          </Button>
          {contactOpen && (
            <ClickAwayListener onClickAway={() => setContactOpen(false)}>
              <Paper
                elevation={4}
                style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  zIndex: 10,
                  minWidth: 260,
                  padding: 16,
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="flex-start"
                  mb={1}
                >
                  <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                    <Box
                      width={36}
                      height={36}
                      borderRadius="50%"
                      bgcolor="#6c1d45"
                      color="#fff"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      style={{ fontWeight: 'bold', fontSize: 14 }}
                    >
                      {initials || '?'}
                    </Box>
                    <Box>
                      <Typography
                        variant="body2"
                        style={{ fontWeight: 'bold' }}
                      >
                        {suggestedByName || t('reviewDialog.unknownUser')}
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setContactOpen(false)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  {item.suggestedBy}
                </Typography>
              </Paper>
            </ClickAwayListener>
          )}
        </Box>
      </Box>

      <Table size="small">
        <TableBody>
          <TableRow>
            <TableCell style={{ fontWeight: 'bold', width: '30%' }}>
              {t('reviewDialog.fieldSummary')}
            </TableCell>
            <TableCell>{item.summary}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell style={{ fontWeight: 'bold' }}>
              {t('reviewDialog.fieldDataType')}
            </TableCell>
            <TableCell>
              {item.dataType}{' '}
              <PlaceIcon
                fontSize="small"
                style={{ verticalAlign: 'middle', color: '#e53935' }}
              />
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell style={{ fontWeight: 'bold' }}>
              {t('reviewDialog.fieldOwner')}
            </TableCell>
            <TableCell>{item.owner}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell style={{ fontWeight: 'bold' }}>
              {t('reviewDialog.fieldAdminRoutine')}
            </TableCell>
            <TableCell>{item.adminRoutine}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell style={{ fontWeight: 'bold' }}>
              {t('reviewDialog.fieldMaintenance')}
            </TableCell>
            <TableCell>{item.maintenanceFrequency}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell style={{ fontWeight: 'bold' }}>
              {t('reviewDialog.fieldHistory')}
            </TableCell>
            <TableCell>
              {item.history.map((h, i) => (
                <div key={i}>{h}</div>
              ))}
            </TableCell>
          </TableRow>
          {expandableRows.map(row => {
            const isOpen = !!expandedRows[row.key];
            return (
              <TableRow key={row.key}>
                <TableCell style={{ fontWeight: 'bold' }}>
                  {row.label}
                </TableCell>
                <TableCell>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleRow(row.key)}
                  >
                    <span>{row.value}</span>
                    {isOpen ? (
                      <KeyboardArrowUpIcon />
                    ) : (
                      <KeyboardArrowDownIcon />
                    )}
                  </Box>
                  {isOpen && (
                    <Box mt={1}>
                      <Box
                        display="inline-block"
                        bgcolor="#f5f5f5"
                        border="1px solid #ddd"
                        borderRadius={4}
                        px={1}
                        py={0.5}
                      >
                        <Typography variant="caption">
                          Grönplan - redigeringsgrupp
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
};
