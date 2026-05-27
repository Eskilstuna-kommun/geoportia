import React from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@material-ui/core';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../../translation';

type DialogHeaderProps = {
  title: string;
  onClose: () => void;
};

const DialogHeader = ({ title, onClose }: DialogHeaderProps) => (
  <DialogTitle>
    <Box display="flex" justifyContent="space-between" alignItems="center">
      <Typography variant="h6">{title}</Typography>
      <IconButton size="small" onClick={onClose}>
        <CloseIcon />
      </IconButton>
    </Box>
  </DialogTitle>
);

const HighlightedItem = ({ title }: { title: string }) => (
  <Box bgcolor="#fdecea" p={1} borderRadius={4} mb={1}>
    <Typography
      variant="body2"
      component="li"
      style={{ fontWeight: 'bold', listStylePosition: 'inside' }}
    >
      {title}
    </Typography>
  </Box>
);

type ApproveProps = {
  open: boolean;
  itemTitle?: string;
  onClose: () => void;
  onConfirm: () => void;
};

export const ApproveConfirmDialog = ({
  open,
  itemTitle,
  onClose,
  onConfirm,
}: ApproveProps) => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogHeader title={t('review.modalTitle')} onClose={onClose} />
      <DialogContent dividers>
        <Typography variant="body2" paragraph>
          {t('reviewDialog.approveConfirmText1')}
        </Typography>
        <Typography variant="body2" paragraph>
          {t('reviewDialog.approveConfirmText2')}
        </Typography>
        <HighlightedItem
          title={itemTitle ?? t('reviewDialog.specNamePlaceholder')}
        />
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          {t('review.cancel')}
        </Button>
        <Button onClick={onConfirm} color="primary" variant="contained">
          {t('reviewDialog.approve')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

type SignProps = {
  open: boolean;
  itemTitles: string[];
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

export const SignConfirmDialog = ({
  open,
  itemTitles,
  onClose,
  onConfirm,
  loading = false,
}: SignProps) => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogHeader title={t('reviewDialog.signTitle')} onClose={onClose} />
      <DialogContent dividers>
        <Typography variant="body2" paragraph>
          {t('reviewDialog.signConfirmText1')}
        </Typography>
        <Typography variant="body2" paragraph>
          {t('reviewDialog.signConfirmText2')}
        </Typography>
        {itemTitles.map((title, i) => (
          <HighlightedItem key={i} title={title} />
        ))}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose} disabled={loading}>
          {t('review.cancel')}
        </Button>
        <Button
          onClick={onConfirm}
          color="primary"
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {t('reviewDialog.confirmSign')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

type SuccessProps = {
  open: boolean;
  onClose: () => void;
};

export const SignSuccessDialog = ({ open, onClose }: SuccessProps) => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogHeader title={t('reviewDialog.signTitle')} onClose={onClose} />
      <DialogContent dividers>
        <Typography variant="body2">
          {t('reviewDialog.signSuccessText')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          {t('reviewDialog.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
