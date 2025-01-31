import React, { FC, useCallback } from 'react';
import { ANNOTATION_LOCATION, Entity } from '@backstage/catalog-model';
import {
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  UseFormRegisterReturn,
} from 'react-hook-form';
import { useApi } from '@backstage/core-plugin-api';
import { metadataApiRef } from '../client';
import { Button, Grid, TextField, Typography } from '@material-ui/core';
import {
  catalogApiRef,
  EntityPeekAheadPopover,
} from '@backstage/plugin-catalog-react';
import { Table, TableColumn } from '@backstage/core-components';
import _ from 'lodash';
import {
  TableCreate,
  TableResponse,
} from '@internal/geoportia-metadata-common/src/schema/openapi';

const asInputRef = (renderResult: UseFormRegisterReturn) => {
  const { ref, ...rest } = renderResult;
  return {
    inputRef: ref,
    ...rest,
  };
};

const AttributesTable: FC = () => {
  const { register } = useFormContext<TableCreate>();
  const { fields, append, remove } = useFieldArray<TableCreate>({
    name: 'attributes',
  });

  const columns: TableColumn<(typeof fields)[number] & { index: number }>[] = [
    {
      title: 'Name',
      render: item => <input {...register(`attributes.${item.index}.name`)} />,
    },
    {
      title: 'Title',
      render: item => <input {...register(`attributes.${item.index}.title`)} />,
    },
    {
      title: 'Type',
      render: item => (
        <select {...register(`attributes.${item.index}.type`)}>
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="date">Date</option>
          <option value="datetime">Date & Time</option>
        </select>
      ),
    },
    {
      title: 'Sensitive',
      render: item => (
        <input
          type="checkbox"
          {...register(`attributes.${item.index}.properties.sensitive`)}
        />
      ),
    },
  ];

  return (
    <Table
      title="Attributes"
      options={{ search: false, paging: false }}
      columns={columns}
      data={fields.map((value, index) => ({
        ...value,
        index,
      }))}
      editable={{
        onRowDelete: async oldData => remove(oldData.index),
      }}
      components={{
        Toolbar: () => (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '1rem',
            }}
          >
            <Typography variant="h5">Attributes</Typography>
            <Button
              onClick={() =>
                append({
                  name: '',
                  title: '',
                  type: 'string',
                  properties: {
                    sensitive: false,
                  },
                })
              }
            >
              Add
            </Button>
          </div>
        ),
      }}
    />
  );
};

export const TableMetadataForm: FC<{
  entity: Entity;
  current?: TableResponse;
  onSaved: () => void;
}> = ({ entity, current, onSaved }) => {
  const methods = useForm<TableCreate>({
    defaultValues: _.pick(
      current,
      'title',
      'owner',
      'attributes',
      'properties',
    ) ?? {
      title: '',
      owner: '',
      attributes: [],
      properties: {
        description: '',
      },
    },
    mode: 'onBlur',
  });
  const { handleSubmit, register, watch, formState, setError } = methods;

  const api = useApi(metadataApiRef);
  const onSubmit = useCallback(
    async (data: TableCreate) => {
      const resp = await api.createTableDescription({
        body: data,
        path: {
          database: entity.metadata.annotations![ANNOTATION_LOCATION]!,
          table: entity.metadata.name,
        },
      });
      if (resp.status > 299) {
        setError('root', {
          type: 'error',
          message: `Failed to create table description, status ${resp.status}`,
        });
        return;
      }
      onSaved();
      setTimeout(() => window.location.reload(), 250);
    },
    [api, entity.metadata.annotations, entity.metadata.name, onSaved, setError],
  );

  const owner = watch('owner');

  const catalogApi = useApi(catalogApiRef);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              {...asInputRef(register('title', { required: true }))}
              label="Title"
              required
              fullWidth
              error={Boolean(formState.errors.title)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              {...asInputRef(register('properties.description'))}
              label="Description"
              fullWidth
              multiline
              error={Boolean(formState.errors.properties?.description)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              {...asInputRef(
                register('owner', {
                  required: true,
                  validate: async value => {
                    const e = await catalogApi.getEntityByRef(`user:${value}`);
                    return e ? true : 'Owner not found';
                  },
                }),
              )}
              label="Owner"
              required
              fullWidth
              error={Boolean(formState.errors.owner)}
            />
            {owner && !formState.errors.owner && (
              <EntityPeekAheadPopover entityRef={`user:${owner}`}>
                {owner}
              </EntityPeekAheadPopover>
            )}
          </Grid>
          <Grid item xs={12}>
            <AttributesTable />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" color="primary" type="submit">
              Save
            </Button>
          </Grid>
        </Grid>
      </form>
    </FormProvider>
  );
};
