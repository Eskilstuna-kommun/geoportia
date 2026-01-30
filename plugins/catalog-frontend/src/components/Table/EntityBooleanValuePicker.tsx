import { useEntityList } from '@backstage/plugin-catalog-react';
import { CustomFilters, EntityBooleanFilter } from './CustomFilter';
import React, { useEffect } from 'react';

export const EntityBooleanValuePicker = ({columnOptions, filteredColumns}:{
  columnOptions: string[],
  filteredColumns: Record<string, string>}
) => {
  const { updateFilters } =
    useEntityList<CustomFilters>();

  useEffect(() => {
    updateFilters(prev => {
      const next = {
        ...prev,
        booleanFilters: new EntityBooleanFilter(columnOptions, filteredColumns),
      };
      return next;
    });
  }, [filteredColumns, updateFilters, columnOptions]);

  return <></>;
};
