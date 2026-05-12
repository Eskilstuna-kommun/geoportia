import { makeStyles, Theme } from '@material-ui/core';

export const useMainGeoDatasetStyles = makeStyles((theme: Theme) => ({
  tabsContainer: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(2),
  },
  tabs: {
    minHeight: 40,
  },
  tab: {
    textTransform: 'none' as const,
    minWidth: 'auto',
    minHeight: 40,
    padding: theme.spacing(1, 2),
    fontWeight: 400,
    '&.Mui-selected': {
      fontWeight: 500,
    },
  },
  indicator: {
    backgroundColor: theme.palette.primary.main,
    height: 3,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2),
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  searchField: {
    minWidth: 200,
  },
  viewSelect: {
    minWidth: 120,
  },
  paginationInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  pageTitle: {
    marginBottom: theme.spacing(2),
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusError: {
    backgroundColor: '#f44336',
    color: 'white',
  },
  statusWarning: {
    backgroundColor: '#ff9800',
    color: 'white',
  },
  statusSuccess: {
    backgroundColor: '#4caf50',
    color: 'white',
  },
  shieldIcon: {
    width: 20,
    height: 20,
  },
  shieldGreen: {
    color: '#4caf50',
  },
  shieldYellow: {
    color: '#ff9800',
  },
  shieldRed: {
    color: '#f44336',
  },
  openDataYes: {
    color: '#4caf50',
  },
  openDataNo: {
    color: '#f44336',
  },
  titleCell: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
  },
  lockIcon: {
    fontSize: 16,
    color: theme.palette.text.secondary,
  },
}));
