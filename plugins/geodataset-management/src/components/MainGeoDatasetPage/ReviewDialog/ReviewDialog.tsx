import React, { useState } from 'react';
import {
  Badge,
  Box,
  Button,
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
import CloseIcon from '@mui/icons-material/Close';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../../translation';
import { mockReviewItems } from '../../../data';
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

  const detailItem =
    mockReviewItems.find(r => r.id === detailItemId) || null;
  const toReviewItems = mockReviewItems.filter(
    r => !reviewedIds.includes(r.id),
  );
  const toSignItems = mockReviewItems.filter(r => reviewedIds.includes(r.id));

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

  const handleConfirmApprove = () => {
    if (detailItemId) {
      setReviewedIds(prev => [...prev, detailItemId]);
      setDialogSelectedRows(prev => prev.filter(id => id !== detailItemId));
      setDetailItemId(null);
    }
    setApproveConfirmOpen(false);
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
          {dialogTab === 0 && !detailItem && (
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

          {dialogTab === 0 && detailItem && (
            <ReviewDetailView item={detailItem} />
          )}

          {dialogTab === 1 && (
            <SignListView
              items={toSignItems}
              selectedRows={signSelectedRows}
              onToggleRow={toggleSignRow}
              onToggleAll={toggleAllSign}
            />
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

          {dialogTab === 0 && !detailItem && (
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

          {dialogTab === 0 && detailItem && (
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

          {dialogTab === 1 && (
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
