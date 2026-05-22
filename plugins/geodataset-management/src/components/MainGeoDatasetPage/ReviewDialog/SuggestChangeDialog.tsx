import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@material-ui/core';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../../translation';

type Props = {
  open: boolean;
  itemTitle?: string;
  onClose: () => void;
  onSubmit: (message: string) => void;
};

export const SuggestChangeDialog = ({
  open,
  itemTitle,
  onClose,
  onSubmit,
}: Props) => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) setMessage('');
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {t('reviewDialog.suggestChange')}
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" paragraph>
          {t('reviewDialog.suggestChangeDescription')}
        </Typography>
        {itemTitle && (
          <Typography variant="body2" style={{ fontWeight: 'bold' }} paragraph>
            {itemTitle}
          </Typography>
        )}
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={4}
          variant="outlined"
          label={t('reviewDialog.suggestChangeLabel')}
          value={message}
          onChange={e => setMessage(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          {t('review.cancel')}
        </Button>
        <Button
          onClick={() => onSubmit(message)}
          color="primary"
          variant="contained"
          disabled={message.trim().length === 0}
        >
          {t('reviewDialog.sendSuggestion')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
