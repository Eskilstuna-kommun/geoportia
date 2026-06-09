import React, { useCallback, useMemo } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import TextField from '@material-ui/core/TextField';
import Autocomplete, {
  createFilterOptions,
} from '@material-ui/lab/Autocomplete';
import useAsync from 'react-use/lib/useAsync';
import { useApi } from '@backstage/core-plugin-api';
import { useTranslationRef } from '@backstage/core-plugin-api/alpha';
import {
  catalogApiRef,
  entityPresentationApiRef,
  EntityDisplayName,
} from '@backstage/plugin-catalog-react';
import { parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import type { Entity } from '@backstage/catalog-model';
import { geoportiaMetadataTranslationRef } from '../translation';

export const TableSelectWidget = (props: WidgetProps) => {
  const { id, value, onChange, disabled, readonly, required, formContext } =
    props;

  const { t } = useTranslationRef(geoportiaMetadataTranslationRef);
  const catalogApi = useApi(catalogApiRef);
  const entityPresentationApi = useApi(entityPresentationApiRef);

  // The parent "Databas" field may emit either a plain catalog name or a
  // full entity ref. Normalize to a plain name so we can match against
  // Schema.spec.database.
  const parentFormData = (formContext as { parentFormData?: unknown })
    ?.parentFormData as Record<string, unknown> | undefined;

  const selectedDatabase = useMemo(() => {
    const raw = parentFormData?.database;
    if (typeof raw !== 'string' || !raw) return undefined;
    if (raw.includes(':') || raw.includes('/')) {
      try {
        return parseEntityRef(raw).name;
      } catch {
        return raw;
      }
    }
    return raw;
  }, [parentFormData?.database]);

  const { value: entities, loading } = useAsync(async () => {
    if (!selectedDatabase) {
      return { tables: [], entityRefToPresentation: new Map() };
    }

    // 1. Fetch all Schemas tied to the selected database.
    const { items: schemas } = await catalogApi.getEntities({
      filter: { kind: 'Schema', 'spec.database': selectedDatabase },
      fields: ['kind', 'metadata.name', 'metadata.namespace', 'relations'],
    });

    // Collect the set of Table entity refs reachable from those schemas via
    // their dependencyOf relations.
    const tableRefs = new Set<string>();
    for (const schema of schemas) {
      for (const rel of schema.relations ?? []) {
        if (rel.type === 'dependencyOf') {
          // dependencyOf targets the Table entity ref (string).
          tableRefs.add(rel.targetRef);
        }
      }
    }

    // 2. Fetch the actual Table entities. Fall back to fetching all Tables
    // when no schema-relations were found (best-effort UX).
    const { items: allTables } = await catalogApi.getEntities({
      filter: { kind: 'Table' },
      fields: [
        'kind',
        'metadata.name',
        'metadata.namespace',
        'metadata.title',
        'metadata.description',
        'spec.dialect',
      ],
    });

    const tables = tableRefs.size
      ? allTables.filter(e => tableRefs.has(stringifyEntityRef(e)))
      : allTables;

    const entityRefToPresentation = new Map(
      await Promise.all(
        tables.map(async item => {
          const presentation = await entityPresentationApi.forEntity(item)
            .promise;
          return [stringifyEntityRef(item), presentation] as const;
        }),
      ),
    );

    return { tables, entityRefToPresentation };
  }, [catalogApi, entityPresentationApi, selectedDatabase]);

  const onSelect = useCallback(
    (_event: unknown, selected: Entity | null) => {
      onChange(selected ? selected.metadata.name : undefined);
    },
    [onChange],
  );

  const selectedEntity =
    entities?.tables.find(e => e.metadata.name === value) ?? null;

  const placeholder = !selectedDatabase
    ? t('scaffolder.tableSelect.selectDatabaseHelper')
    : loading
      ? t('scaffolder.tableSelect.loadingTables')
      : t('scaffolder.tableSelect.placeholder');

  return (
    <Autocomplete
      id={id}
      value={selectedEntity}
      loading={loading}
      onChange={onSelect}
      options={entities?.tables ?? []}
      disabled={disabled || readonly || !selectedDatabase}
      getOptionLabel={option =>
        entities?.entityRefToPresentation.get(stringifyEntityRef(option))
          ?.entityRef ?? option.metadata.name
      }
      renderOption={option => <EntityDisplayName entityRef={option} />}
      noOptionsText={
        !selectedDatabase
          ? t('scaffolder.tableSelect.selectDatabaseHelper')
          : t('scaffolder.tableSelect.noTables')
      }
      renderInput={params => (
        <TextField
          {...params}
          margin="dense"
          variant="outlined"
          required={required}
          disabled={disabled || readonly || !selectedDatabase}
          placeholder={placeholder}
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
