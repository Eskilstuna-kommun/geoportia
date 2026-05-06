import React, { PropsWithChildren, useState } from 'react';
import { makeStyles, Theme } from '@material-ui/core/styles';
import { ListItem, Collapse } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import CreateComponentIcon from '@material-ui/icons/AddCircleOutline';
import LogoFull from './LogoFull';
import LogoIcon from './LogoIcon';
import {
  Settings as SidebarSettings,
  UserSettingsSignInAvatar,
} from '@backstage/plugin-user-settings';
import { SidebarSearchModal } from '@backstage/plugin-search';
import {
  Sidebar,
  sidebarConfig,
  SidebarDivider,
  SidebarGroup,
  SidebarItem,
  SidebarPage,
  SidebarSpace,
  useSidebarOpenState,
  Link,
} from '@backstage/core-components';
import MenuIcon from '@material-ui/icons/Menu';
import SearchIcon from '@material-ui/icons/Search';
import { useLocation } from 'react-router-dom';

import {
  FmeIcon,
  DatabaseIcon,
  GeoserverIcon,
  ControllpanelIcon,
} from './MenuIcons';

const useSidebarLogoStyles = makeStyles({
  root: {
    width: '100%',
    height: 3 * sidebarConfig.logoHeight,
    display: 'flex',
    flexFlow: 'row nowrap',
    alignItems: 'center',
    marginBottom: -14,
  },
  link: {
    width: sidebarConfig.drawerWidthClosed,
    marginLeft: 24,
  },
});

const useExpandableStyles = makeStyles<Theme>(theme => ({
  listItemRoot: {
    padding: 0,
    '&:hover': {
      backgroundColor: 'transparent',
    },
  },
  itemContainer: {
    alignItems: 'center',
    color: theme.palette.navigation?.color,
    display: 'flex',
    flexDirection: 'row',
    fontSize: '0.875rem',
    fontWeight: 400,
    height: '48px',
    lineHeight: '24px',
    paddingLeft: '24px',
    paddingRight: '12px',
    position: 'relative',
    textDecoration: 'none',
    width: '100%',
    '&:hover': {
      backgroundColor: theme.palette.navigation?.navItem?.hoverBackground,
    },
  },
  itemIcon: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    height: '24px',
    justifyContent: 'center',
    marginRight: '8px',
    width: '24px',
    color: theme.palette.navigation?.color,
  },
  itemText: {
    alignItems: 'center',
    display: 'flex',
    flexGrow: 1,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: theme.palette.navigation?.color,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  itemTextHidden: {
    display: 'none',
  },
  expandIcon: {
    alignItems: 'center',
    display: 'flex',
    height: '24px',
    justifyContent: 'center',
    width: '24px',
    color: theme.palette.navigation?.color,
    transition: 'transform 200ms',
  },
  expandIconHidden: {
    display: 'none',
  },
  expandIconExpanded: {
    transform: 'rotate(180deg)',
  },
  submenuLink: {
    display: 'block',
    width: '100%',
    textDecoration: 'none',
  },
  submenuItem: {
    alignItems: 'center',
    color: theme.palette.navigation?.color,
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 400,
    height: '40px',
    paddingLeft: '64px',
    paddingRight: '24px',
    textDecoration: 'none',
    width: '100%',
    '&:hover': {
      backgroundColor: theme.palette.navigation?.navItem?.hoverBackground,
    },
  },
  itemTextActive: {
    color: theme.palette.primary.main,
  },
  expandIconActive: {
    color: theme.palette.primary.main,
  },
  submenuItemActive: {
    color: theme.palette.primary.main,
  },
}));

interface ExpandableItemProps {
  icon: React.ElementType;
  text: string;
  items: Array<{ to: string; text: string }>;
}

const ExpandableItem: React.FC<ExpandableItemProps> = ({
  icon: Icon,
  text,
  items,
}) => {
  const classes = useExpandableStyles();
  const [isExpanded, setIsExpanded] = useState(false);
  const location = useLocation();
  const { isOpen } = useSidebarOpenState();

  const isAnySubmenuActive = items.some(item =>
    location.pathname.includes(item.to),
  );

  // Close submenu when sidebar closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsExpanded(false);
    }
  }, [isOpen]);

  return (
    <>
      <ListItem
        button
        disableGutters
        onClick={() => isOpen && setIsExpanded(!isExpanded)}
        style={{ padding: 0 }}
        classes={{ root: classes.listItemRoot }}
      >
        <div className={classes.itemContainer}>
          <div className={classes.itemIcon}>
            <Icon />
          </div>
          <div
            className={`${classes.itemText} ${
              isAnySubmenuActive ? classes.itemTextActive : ''
            } ${!isOpen ? classes.itemTextHidden : ''}`}
          >
            {text}
          </div>
          <div
            className={`${classes.expandIcon} ${
              isExpanded ? classes.expandIconExpanded : ''
            } ${isAnySubmenuActive ? classes.expandIconActive : ''} ${
              !isOpen ? classes.expandIconHidden : ''
            }`}
          >
            <ExpandMoreIcon />
          </div>
        </div>
      </ListItem>
      <Collapse
        in={isExpanded && isOpen}
        timeout="auto"
        unmountOnExit
        style={{ width: '100%' }}
      >
        {items.map((item, index) => {
          const isActive = location.pathname.includes(item.to);
          return (
            <Link
              to={item.to}
              underline="none"
              key={item.to || index}
              className={classes.submenuLink}
            >
              <div
                className={`${classes.submenuItem} ${
                  isActive ? classes.submenuItemActive : ''
                }`}
              >
                {item.text}
              </div>
            </Link>
          );
        })}
      </Collapse>
    </>
  );
};

const SidebarLogo = () => {
  const classes = useSidebarLogoStyles();
  const { isOpen } = useSidebarOpenState();

  return (
    <div className={classes.root}>
      <Link to="/" underline="none" className={classes.link} aria-label="Home">
        {isOpen ? <LogoFull /> : <LogoIcon />}
      </Link>
    </div>
  );
};

export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <Sidebar>
      <SidebarLogo />
      <SidebarGroup label="Search" icon={<SearchIcon />} to="/search">
        <SidebarSearchModal />
      </SidebarGroup>
      <SidebarDivider />
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        <SidebarItem icon={ControllpanelIcon} to="/" text="Min sida" />
        <ExpandableItem
          icon={DatabaseIcon}
          text="Huvudgeodatamängd"
          items={[
            { to: 'listView', text: 'Listvy' },
            { to: 'permissionGroups', text: 'Behörighetsgrupper' },
          ]}
        />

          <ExpandableItem
            icon={DatabaseIcon}
            text="Databashantering"
            items={[
              { to: 'database', text: 'Databaser' },
              { to: 'databaseUsers', text: 'Databasanvändare' },
              { to: 'roles', text: 'Roller' },
              { to: 'dataset', text: 'Dataset (ESRI)' },
            ]}
          />
        <ExpandableItem
          icon={GeoserverIcon}
          text="Geoserver"
          items={[
            { to: 'geoserverlayer', text: 'Geoserver Layers' },
            { to: 'geoserverstore', text: 'Geoserver Stores' },
          ]}
        />

        <ExpandableItem
          icon={GeoserverIcon}
          text="ArcGIS SDE"
          items={[
            { to: 'domain', text: 'Domains' },
            { to: 'value', text: 'Values' },
            { to: 'dataset', text: 'Data Sets' },
            { to: 'tables', text: 'Tables' },
            { to: 'field', text: 'Fields' },
          ]}
        />

        <SidebarItem icon={FmeIcon} to="fmeworkspace" text="FME" />
        <SidebarItem icon={CreateComponentIcon} to="create" text="Create..." />
        <SidebarDivider />
      </SidebarGroup>
      <SidebarSpace />
      <SidebarDivider />
      <SidebarGroup
        label="Settings"
        icon={<UserSettingsSignInAvatar />}
        to="/settings"
      >
        <SidebarSettings />
      </SidebarGroup>
    </Sidebar>
    {children}
  </SidebarPage>
);
