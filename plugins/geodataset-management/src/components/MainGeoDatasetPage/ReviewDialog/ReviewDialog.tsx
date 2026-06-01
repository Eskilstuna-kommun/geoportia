import React, { useMemo, useState } from 'react';
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
import { metadataEntryUpdatePermission } from '@internal/backstage-plugin-geoportia-metadata-common';
import { usePermission } from '@backstage/plugin-permission-react';
import { geodatasetManagementTranslationRef } from '../../../translation';
import { ReviewItem } from '../../../data';
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
  reviewItems: ReviewItem[];
  reviewItemsLoading: boolean;
  reviewItemsError: Error | undefined;
  retryReviewItems: () => void;
  reviewedIds: string[];
  setReviewedIds: React.Dispatch<React.SetStateAction<string[]>>;
};

export const ReviewDialog = ({
  open,
  onClose,
  reviewItems,
  reviewItemsLoading,
  reviewItemsError,
  retryReviewItems,
  reviewedIds,
  setReviewedIds,
}: Props) => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  const metadataApi = useApi(metadataApiRef);
  // Whether the current user is allowed to review/accept change suggestions.
  // Resolved via the Backstage permission framework so the gate stays in
  // sync with the backend policy.
  const { allowed: canReview, loading: permissionLoading } = usePermission({
    permission: metadataEntryUpdatePermission,
    resourceRef: undefined,
  });

  const [dialogTab, setDialogTab] = useState(0);
  const [expanded, setExpanded] = useState(true);
  const [dialogSelectedRows, setDialogSelectedRows] = useState<string[]>([]);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [signConfirmOpen, setSignConfirmOpen] = useState(false);
  const [signSuccessOpen, setSignSuccessOpen] = useState(false);
  const [suggestChangeOpen, setSuggestChangeOpen] = useState(false);
  const [signSelectedRows, setSignSelectedRows] = useState<string[]>([]);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const { toReviewItems, toSignItems, detailItem } = useMemo(() => {
    const reviewedSet = new Set(reviewedIds);
    return {
      toReviewItems: reviewItems.filter(r => !reviewedSet.has(r.id)),
      toSignItems: reviewItems.filter(r => reviewedSet.has(r.id)),
      detailItem: reviewItems.find(r => r.id === detailItemId) ?? null,
    };
  }, [reviewItems, reviewedIds, detailItemId]);

  const signItemTitles = useMemo(
    () =>
      signSelectedRows.map(
        id =>
          toSignItems.find(r => r.id === id)?.title ??
          t('reviewDialog.specNamePlaceholder'),
      ),
    [signSelectedRows, toSignItems, t],
  );

  const canShowContent = canReview && !reviewItemsLoading;
  const toggleInList = (list: string[], id: string) =>
    list.includes(id) ? list.filter(r => r !== id) : [...list, id];

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
    setDialogSelectedRows(prev => toggleInList(prev, id));

  const toggleAllReview = () =>
    setDialogSelectedRows(prev =>
      prev.length === toReviewItems.length ? [] : toReviewItems.map(r => r.id),
    );

  const toggleSignRow = (id: string) =>
    setSignSelectedRows(prev => toggleInList(prev, id));

  const toggleAllSign = () =>
    setSignSelectedRows(prev =>
      prev.length === toSignItems.length ? [] : toSignItems.map(r => r.id),
    );

  const handleConfirmApprove = () => {
    setApproveConfirmOpen(false);
    if (!detailItem) return;
    // Just move item to "Att signera" tab - actual submission happens on sign
    setReviewedIds(prev => [...prev, detailItem.id]);
    setDialogSelectedRows(prev => prev.filter(id => id !== detailItem.id));
    setDetailItemId(null);
  };

  const acceptOne = async (item: ReviewItem) => {
    const response = await metadataApi.acceptSuggestion({
      path: {
        entityRef: encodeURIComponent(item.uuid),
        id: Number(item.id),
      },
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      throw new Error(
        data?.error?.message ||
          `Failed to accept ${item.title}: ${response.statusText}`,
      );
    }
  };

  const handleConfirmSign = async () => {
    if (signSelectedRows.length === 0) {
      setSignConfirmOpen(false);
      return;
    }
    setAccepting(true);
    setAcceptError(null);

    try {
      const items = signSelectedRows
        .map(id => toSignItems.find(r => r.id === id))
        .filter((item): item is ReviewItem => Boolean(item));

      for (const item of items) {
        await acceptOne(item);
      }

      setReviewedIds(prev => prev.filter(id => !signSelectedRows.includes(id)));
      setSignSelectedRows([]);
      setSignConfirmOpen(false);
      setSignSuccessOpen(true);
      retryReviewItems();
    } catch (err: any) {
      setAcceptError(err?.message ?? 'Unknown error');
      setSignConfirmOpen(false);
    } finally {
      setAccepting(false);
    }
  };

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
          {!permissionLoading && !canReview && (
            <Alert severity="warning">
              {t('reviewDialog.adminOnly')}
            </Alert>
          )}

          {canReview && reviewItemsError && (
            <Alert severity="error">{reviewItemsError.message}</Alert>
          )}

          {canReview && acceptError && (
            <Alert severity="error" onClose={() => setAcceptError(null)}>
              {acceptError}
            </Alert>
          )}

          {canReview && (reviewItemsLoading || permissionLoading) && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}

          {canShowContent && dialogTab === 0 && !detailItem && (
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

          {canShowContent && dialogTab === 0 && detailItem && (
            <ReviewDetailView item={detailItem} />
          )}

          {canShowContent && dialogTab === 1 && (
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

          {canReview && dialogTab === 0 && !detailItem && (
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

          {canReview && dialogTab === 0 && detailItem && (
            <>
              <Button
                variant="outlined"
                onClick={() => setSuggestChangeOpen(true)}
              >
                {t('reviewDialog.suggestChange')}
              </Button>
              <Button
                onClick={() => setApproveConfirmOpen(true)}
                color="primary"
                variant="contained"
              >
                {t('reviewDialog.approve')}
              </Button>
            </>
          )}

          {canReview && dialogTab === 1 && (
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
        loading={accepting}
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
