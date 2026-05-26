import React, { useCallback } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import TextField from '@material-ui/core/TextField';
import Autocomplete, {
  createFilterOptions,
} from '@material-ui/lab/Autocomplete';
import useAsync from 'react-use/lib/useAsync';
import { useApi } from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  entityPresentationApiRef,
  EntityDisplayName,
} from '@backstage/plugin-catalog-react';
import { stringifyEntityRef } from '@backstage/catalog-model';
import type { Entity } from '@backstage/catalog-model';

export const DatabaseSelectWidget = (props: WidgetProps) => {
  const { id, value, onChange, disabled, readonly, required } = props;

  const catalogApi = useApi(catalogApiRef);
  const entityPresentationApi = useApi(entityPresentationApiRef);

  const { value: entities, loading } = useAsync(async () => {
    const { items } = await catalogApi.getEntities({
      filter: { kind: 'Resource', 'spec.type': 'database' },
      fields: [
        'kind',
        'metadata.name',
        'metadata.namespace',
        'metadata.title',
        'metadata.description',
        'spec.type',
      ],
    });
    const entityRefToPresentation = new Map(
      await Promise.all(
        items.map(async item => {
          const presentation = await entityPresentationApi.forEntity(item)
            .promise;
          return [stringifyEntityRef(item), presentation] as const;
        }),
      ),
    );
    return { catalogEntities: items, entityRefToPresentation };
  }, [catalogApi, entityPresentationApi]);

  const onSelect = useCallback(
    (_event: unknown, selected: Entity | null) => {
      onChange(selected ? selected.metadata.name : undefined);
    },
    [onChange],
  );

  const selectedEntity =
    entities?.catalogEntities.find(e => e.metadata.name === value) ?? null;

  return (
    <Autocomplete
      id={id}
      value={selectedEntity}
      loading={loading}
      onChange={onSelect}
      options={entities?.catalogEntities ?? []}
      disabled={disabled || readonly}
      getOptionLabel={option =>
        entities?.entityRefToPresentation.get(stringifyEntityRef(option))
          ?.entityRef ?? option.metadata.name
      }
      renderOption={option => <EntityDisplayName entityRef={option} />}
      renderInput={params => (
        <TextField
          {...params}
          margin="dense"
          variant="outlined"
          required={required}
          disabled={disabled || readonly}
          InputProps={params.InputProps}
        />
      )}
      filterOptions={createFilterOptions({
        stringify: option =>
          entities?.entityRefToPresentation.get(stringifyEntityRef(option))
            ?.primaryTitle ?? option.metadata.name,
      })}
    />
  );
};
