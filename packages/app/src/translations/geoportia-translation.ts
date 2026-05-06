import { createTranslationRef } from '@backstage/core-plugin-api/alpha';

/** @public */
export const geoportiaTranslationRef = createTranslationRef({
  id: 'geoportia',
  messages: {
    customIndexPage: {
      supportButtonContent: 'All your software catalog entities',
      filterButton: 'Filter',
      filterTooltip: 'Select filters to apply',
      columnsButton: 'Columns',
      columnsTooltip: 'Select columns to display',
      filterOptions: {
        none: 'Do not filter',
        true: 'Filter on true',
        false: 'Filter on false',
      },
      columns: {
        name: 'Name',
        system: 'System',
        owner: 'Owner',
        type: 'Type',
        lifecycle: 'Lifecycle',
        description: 'Description',
        tags: 'Tags',
        even: 'Even',
        long: 'Long',
      },
    },
  },
});
