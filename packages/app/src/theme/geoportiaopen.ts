import { makeStyles } from '@material-ui/core/styles';

export const useGeoportiaOpenStyles = makeStyles(theme => ({
  catalogFilterContainer: {
  },
  columnMenu: {
    maxWidth: '83.333333%',
    minHeight: 32,
    position: 'relative',
    zIndex: 1,
    marginBottom: 5,
  },
  columnMenuDropdownContainer: {
    position: 'absolute',
    minWidth: 150,
    right: 0,
    top: 0,
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
  }
}));
