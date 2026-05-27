import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Tab,
  Tabs,
  Typography,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import CloseIcon from '@mui/icons-material/Close';
import { useApi } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { metadataApiRef } from '@internal/backstage-plugin-geoportia-metadata';
import { geodatasetManagementTranslationRef } from '../../../translation';
import { useReviewSuggestions } from '../../../hooks/useReviewSuggestions';
import { useIsGeoportiaAdmin } from '../../../hooks/useIsGeoportiaAdmin';
import { ReviewIntro } from './ReviewIntro';
import { ReviewListTable } from './ReviewListTable';
import { ReviewDetailView } from './ReviewDetailView';
import { SignListView } from './SignListView';
import {
  ApproveConfirmDialog,
  SignConfirmDialog,
  SignSuccessDialog,
} from './ConfirmDialogs';
import { SuggestChangeDialog } from './SuggestChangeDialog';

type Props = {
  open: boolean;
  onClose: () => void;
};

export const ReviewDialog = ({ open, onClose }: Props) => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  const metadataApi = useApi(metadataApiRef);
  const { isAdmin, loading: adminLoading } = useIsGeoportiaAdmin();
  const {
    value: reviewItems = [],
    loading: itemsLoading,
    error: itemsError,
    retry: retryItems,
  } = useReviewSuggestions();

  const [dialogTab, setDialogTab] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [dialogSelectedRows, setDialogSelectedRows] = useState<string[]>([]);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [signConfirmOpen, setSignConfirmOpen] = useState(false);
  const [signSuccessOpen, setSignSuccessOpen] = useState(false);
  const [suggestChangeOpen, setSuggestChangeOpen] = useState(false);
  const [reviewedIds, setReviewedIds] = useState<string[]>([]);
  const [signSelectedRows, setSignSelectedRows] = useState<string[]>([]);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const detailItem =
    reviewItems.find(r => r.id === detailItemId) || null;
  const toReviewItems = reviewItems.filter(
    r => !reviewedIds.includes(r.id),
  );
  const toSignItems = reviewItems.filter(r => reviewedIds.includes(r.id));

  const handleClose = () => {
    setDetailItemId(null);
    onClose();
  };

  const handleDialogTabChange = (
    _event: React.ChangeEvent<{}>,
    newValue: number,
  ) => {
    setDialogTab(newValue);
    setDetailItemId(null);
  };

  const toggleRow = (id: string) =>
    setDialogSelectedRows(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id],
    );

  const toggleAllReview = () => {
    if (dialogSelectedRows.length === toReviewItems.length) {
      setDialogSelectedRows([]);
    } else {
      setDialogSelectedRows(toReviewItems.map(r => r.id));
    }
  };

  const toggleSignRow = (id: string) =>
    setSignSelectedRows(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id],
    );

  const toggleAllSign = () => {
    if (signSelectedRows.length === toSignItems.length) {
      setSignSelectedRows([]);
    } else {
      setSignSelectedRows(toSignItems.map(r => r.id));
    }
  };

  const handleConfirmApprove = async () => {
    if (!detailItem) {
      setApproveConfirmOpen(false);
      return;
    }
    setAccepting(true);
    setAcceptError(null);
    try {
      const suggestionId = Number(detailItem.id);
      // detailItem.uuid carries the entityRef of the metadata entry.
      const response = await metadataApi.acceptSuggestion({
        path: {
          entityRef: encodeURIComponent(detailItem.uuid),
          id: suggestionId,
        },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          (data as { error?: { message?: string } })?.error?.message ||
            `Failed to accept: ${response.statusText}`,
        );
      }
      setReviewedIds(prev => [...prev, detailItem.id]);
      setDialogSelectedRows(prev => prev.filter(id => id !== detailItem.id));
      setDetailItemId(null);
      // Refresh list now that the accepted suggestion is removed server-side.
      retryItems();
    } catch (err: any) {
      setAcceptError(err?.message ?? 'Unknown error');
    } finally {
      setAccepting(false);
      setApproveConfirmOpen(false);
    }
  };

  const handleConfirmSign = () => {
    setReviewedIds(prev => prev.filter(id => !signSelectedRows.includes(id)));
    setSignConfirmOpen(false);
    setSignSelectedRows([]);
    setSignSuccessOpen(true);
  };

  const signItemTitles = signSelectedRows.map(
    id =>
      toSignItems.find(r => r.id === id)?.title ??
      t('reviewDialog.specNamePlaceholder'),
  );

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h6">
              {dialogTab === 1
                ? t('reviewDialog.signTitle')
                : t('review.modalTitle')}
            </Typography>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <Box borderBottom={1} borderColor="divider" px={2}>
          <Tabs
            value={dialogTab}
            onChange={handleDialogTabChange}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab
              label={
                <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                  {t('reviewDialog.toReview')}
                  <Badge
                    badgeContent={toReviewItems.length}
                    color="primary"
                  />
                </Box>
              }
            />
            <Tab
              label={
                <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                  {t('reviewDialog.toSign')}
                  <Badge badgeContent={toSignItems.length} color="primary" />
                </Box>
              }
            />
          </Tabs>
        </Box>

        <DialogContent>
          {!adminLoading && !isAdmin && (
            <Alert severity="warning">
              {t('reviewDialog.adminOnly')}
            </Alert>
          )}

          {isAdmin && itemsError && (
            <Alert severity="error">{itemsError.message}</Alert>
          )}

          {isAdmin && acceptError && (
            <Alert severity="error" onClose={() => setAcceptError(null)}>
              {acceptError}
            </Alert>
          )}

          {isAdmin && (itemsLoading || adminLoading) && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}

          {isAdmin && !itemsLoading && dialogTab === 0 && !detailItem && (
            <Box>
              <ReviewIntro
                expanded={expanded}
                onToggle={() => setExpanded(!expanded)}
              />
              <ReviewListTable
                items={toReviewItems}
                selectedRows={dialogSelectedRows}
                onToggleRow={toggleRow}
                onToggleAll={toggleAllReview}
                onOpenDetail={setDetailItemId}
              />
            </Box>
          )}

          {isAdmin && !itemsLoading && dialogTab === 0 && detailItem && (
            <ReviewDetailView item={detailItem} />
          )}

          {isAdmin && !itemsLoading && dialogTab === 1 && (
            <Box>
              <ReviewIntro
                expanded={expanded}
                onToggle={() => setExpanded(!expanded)}
              />
              <SignListView
                items={toSignItems}
                selectedRows={signSelectedRows}
                onToggleRow={toggleSignRow}
                onToggleAll={toggleAllSign}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Link
            component="button"
            variant="body2"
            onClick={handleClose}
            style={{ marginRight: 'auto', cursor: 'pointer' }}
          >
            {t('review.cancel')}
          </Link>

          {isAdmin && dialogTab === 0 && !detailItem && (
            <Button
              onClick={() => {
                const id = dialogSelectedRows[0] || toReviewItems[0]?.id;
                if (id) setDetailItemId(id);
              }}
              color="primary"
              variant="contained"
              disabled={toReviewItems.length === 0}
            >
              {t('review.confirm')}
            </Button>
          )}

          {isAdmin && dialogTab === 0 && detailItem && (
            <>
              <Button
                variant="outlined"
                onClick={() => setSuggestChangeOpen(true)}
                disabled={accepting}
              >
                {t('reviewDialog.suggestChange')}
              </Button>
              <Button
                onClick={() => setApproveConfirmOpen(true)}
                color="primary"
                variant="contained"
                disabled={accepting}
                startIcon={accepting ? <CircularProgress size={16} /> : undefined}
              >
                {t('reviewDialog.approve')}
              </Button>
            </>
          )}

          {isAdmin && dialogTab === 1 && (
            <Button
              onClick={() => {
                if (signSelectedRows.length > 0) setSignConfirmOpen(true);
              }}
              color="primary"
              variant="contained"
              disabled={signSelectedRows.length === 0}
            >
              {t('reviewDialog.signSelected')} {signSelectedRows.length}{' '}
              {t('reviewDialog.signSelectedSuffix')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ApproveConfirmDialog
        open={approveConfirmOpen}
        itemTitle={detailItem?.title}
        onClose={() => setApproveConfirmOpen(false)}
        onConfirm={handleConfirmApprove}
      />

      <SignConfirmDialog
        open={signConfirmOpen}
        itemTitles={signItemTitles}
        onClose={() => setSignConfirmOpen(false)}
        onConfirm={handleConfirmSign}
      />

      <SignSuccessDialog
        open={signSuccessOpen}
        onClose={() => setSignSuccessOpen(false)}
      />

      <SuggestChangeDialog
        open={suggestChangeOpen}
        itemTitle={detailItem?.title}
        onClose={() => setSuggestChangeOpen(false)}
        onSubmit={() => {
          setSuggestChangeOpen(false);
          setDetailItemId(null);
        }}
      />
    </>
  );
};
