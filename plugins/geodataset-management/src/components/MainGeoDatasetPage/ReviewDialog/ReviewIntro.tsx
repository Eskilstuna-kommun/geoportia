import React from 'react';
import { Box, IconButton, Typography } from '@material-ui/core';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import { geodatasetManagementTranslationRef } from '../../../translation';

type Props = {
  expanded: boolean;
  onToggle: () => void;
};

export const ReviewIntro = ({ expanded, onToggle }: Props) => {
  const { t } = useTranslationRef(geodatasetManagementTranslationRef);
  return (
    <Box>
      <Box display="flex" alignItems="flex-start" mb={1}>
        <Box flex={1}>
          <Typography variant="body2" paragraph>
            {t('reviewDialog.intro1')}
            {!expanded && '...'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onToggle}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {expanded && (
        <>
          <Typography variant="body2" paragraph>
            {t('reviewDialog.intro2')}
          </Typography>
          <Typography variant="body2" style={{ fontWeight: 'bold' }}>
            {t('reviewDialog.agreementIncludes')}
          </Typography>
          <Box component="ul" ml={2} mb={2}>
            <li>
              <Typography variant="body2">
                {t('reviewDialog.agreementItem1')}
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                {t('reviewDialog.agreementItem2')}
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                {t('reviewDialog.agreementItem3')}
              </Typography>
            </li>
          </Box>
          <Typography variant="body2" style={{ fontWeight: 'bold' }}>
            {t('reviewDialog.instructionTitle')}
          </Typography>
          <Box component="ol" ml={2} mb={2}>
            <li>
              <Typography variant="body2">
                {t('reviewDialog.instruction1')}
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                {t('reviewDialog.instruction2')}
              </Typography>
              <Box
                component="ol"
                ml={2}
                style={{ listStyleType: 'lower-alpha' }}
              >
                <li>
                  <Typography variant="body2">
                    {t('reviewDialog.instruction2a')}
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    {t('reviewDialog.instruction2b')}
                  </Typography>
                </li>
              </Box>
            </li>
            <li>
              <Typography variant="body2">
                {t('reviewDialog.instruction3')}
              </Typography>
            </li>
          </Box>
        </>
      )}
    </Box>
  );
};
