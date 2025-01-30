import React, { FC, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Progress,
  ResponseErrorPanel,
  StructuredMetadataTable,
  Table,
  WarningPanel,
} from '@backstage/core-components';
import useAsync from 'react-use/lib/useAsync';
import { metadataApiRef } from '../client';
import { useApi } from '@backstage/core-plugin-api';
import {
  EntityPeekAheadPopover,
  useEntity,
} from '@backstage/plugin-catalog-react';
import { ANNOTATION_LOCATION } from '@backstage/catalog-model';
import {
  Button,
  Drawer,
  Grid,
  IconButton,
  Typography,
} from '@material-ui/core';
import Close from '@material-ui/icons/Close';
import { TableMetadataForm } from './MetadataForm';
import { TableResponse } from '@internal/geoportia-metadata-common/src/schema/openapi';

export interface MetadataCardProps {}

const useStyles = makeStyles(theme => ({
  avatar: {
    height: 32,
    width: 32,
    borderRadius: '50%',
  },
  drawerPaper: {
    width: '50%',
    justifyContent: 'space-between',
    padding: theme.spacing(2.5),
  },
  drawerHeader: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  drawerCloseIcon: {
    fontSize: 20,
  },
  drawerContent: {
    height: '100%',
  },
}));

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

const MetadataDrawer: FC<{
  toggle: (isOpen: boolean) => void;
  title: string;
  current?: TableResponse;
}> = ({ toggle, title, current }) => {
  const classes = useStyles();
  const { entity } = useEntity();

  return (
    <>
      <div className={classes.drawerHeader}>
        <Typography variant="h5">{title}</Typography>
        <IconButton
          title="Close the drawer"
          onClick={() => toggle(false)}
          color="inherit"
        >
          <Close className={classes.drawerCloseIcon} />
        </IconButton>
      </div>
      <div className={classes.drawerContent}>
        <TableMetadataForm
          entity={entity}
          current={current}
          onSaved={() => toggle(false)}
        />
      </div>
    </>
  );
};

export const MetadataCard: FC = () => {
  const api = useApi(metadataApiRef);
  const { entity } = useEntity();

  if (entity.kind !== 'Table') {
    throw new Error('Invalid entity kind');
  }

  const { value, loading, error } = useAsync(async () => {
    const resp = await api.getTableDescription({
      path: {
        database: entity.metadata.annotations![ANNOTATION_LOCATION]!,
        table: entity.metadata.name,
      },
    });
    if (resp.status === 404) {
      throw new NotFoundError(`Failed to fetch table description, not found`);
    } else if (resp.status >= 300) {
      throw new Error(
        `Failed to fetch table description, status ${resp.status}`,
      );
    }
    return resp.json();
  }, []);

  const [isOpen, toggleDrawer] = useState(false);
  const classes = useStyles();

  if (loading) {
    return <Progress />;
  } else if (error && error instanceof NotFoundError) {
    return (
      <>
        <WarningPanel
          title="This item does not have any metadata"
          defaultExpanded
        >
          <Button
            variant="contained"
            color="primary"
            onClick={() => toggleDrawer(true)}
          >
            Create Metadata
          </Button>
        </WarningPanel>
        <Drawer
          classes={{ paper: classes.drawerPaper }}
          anchor="right"
          open={isOpen}
          onClose={() => toggleDrawer(false)}
        >
          <MetadataDrawer toggle={toggleDrawer} title="Create Metadata" />
        </Drawer>
      </>
    );
  } else if (error) {
    return <ResponseErrorPanel error={error} />;
  } else if (!value) {
    return null;
  }

  return (
    <Grid container>
      {!value.active && (
        <Grid item xs={12}>
          <WarningPanel title="No active metadata version" defaultExpanded>
            <Button
              variant="contained"
              color="primary"
              onClick={async () => {
                await api.activateTableDescriptionVersion({
                  path: {
                    database: value!.database,
                    table: value!.name,
                    version: value!.version,
                  },
                });
                window.location.reload();
              }}
            >
              Activate current metadata version
            </Button>
          </WarningPanel>
        </Grid>
      )}
      <Grid item xs={12} md={6}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => toggleDrawer(true)}
          fullWidth
        >
          Edit Metadata
        </Button>
        <Drawer
          classes={{ paper: classes.drawerPaper }}
          anchor="right"
          open={isOpen}
          onClose={() => toggleDrawer(false)}
        >
          <MetadataDrawer
            toggle={toggleDrawer}
            current={value}
            title="Edit Metadata"
          />
        </Drawer>
        <StructuredMetadataTable
          dense
          metadata={{
            table: value.name,
            database: value.database,
            title: value.title,
            ...value.properties,
            owner: (
              <EntityPeekAheadPopover entityRef={`user:${value.owner}`}>
                {value.owner}
              </EntityPeekAheadPopover>
            ),
          }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <Table
          title="History"
          columns={[
            { field: 'version', title: 'Version' },
            { field: 'active', title: 'Is active' },
          ]}
          data={value.versions}
          options={{ search: false, paging: false }}
        />
      </Grid>
      <Grid item xs={12}>
        <Table
          title="Attributes"
          columns={[
            { field: 'name', title: 'Name' },
            { field: 'title', title: 'Title' },
            {
              field: 'type',
              title: 'Type',
              lookup: {
                string: 'String',
                number: 'Number',
                boolean: 'Boolean',
                date: 'Date',
                datetime: 'Date & Time',
              },
            },
            { field: 'properties.sensitive', title: 'Sensitive' },
          ]}
          data={value.attributes}
          options={{ search: false, paging: false }}
        />
      </Grid>
    </Grid>
  );
};
