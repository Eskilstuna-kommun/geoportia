import { makeStyles } from '@material-ui/core/styles';

export const useGeoportiaOpenStyles = makeStyles(theme => ({
  catalogFilterContainer: {
    maxWidth: '83.333333%',
    minHeight: 32,
    position: 'relative',
    zIndex: 1,
    marginBottom: 15,
  },
  catalogMenuContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    display: 'flex',
  },
  columnMenu: {
    minHeight: 32,
    position: 'relative',
    zIndex: 1,
    marginBottom: 5,
  },
  columnMenuDropdownContainer: {
    minWidth: 150,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
  },
  columnMenuButton: {
    position: 'relative',
    width: '100%',
    padding: 5,
    borderRadius: 5,
    border: `1px solid ${theme.palette.divider}`,
  },
  columnMenuDropdown: {
    padding: 5,
  },
  filterMenu: {
    minHeight: 32,
    position: 'relative',
    zIndex: 1,
    marginBottom: 5,
    marginRight: 10,
  },
  filterMenuDropdownContainer: {
    minWidth: 150,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
  },
  filterMenuButton: {
    position: 'relative',
    width: '100%',
    padding: 5,
    borderRadius: 5,
    border: `1px solid ${theme.palette.divider}`,
  },
  filterMenuDropdown: {
    padding: 5,
  },
  filterMenuDropdownForm: {
    padding: 5,
    display: 'inline-grid',
  },
  filterMenuDropdownLabel: {
    padding: 5,
  },
}));
