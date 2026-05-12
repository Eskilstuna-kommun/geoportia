import { createTranslationRef } from '@backstage/core-plugin-api/alpha';

/** @public */
export const geodatasetManagementTranslationRef = createTranslationRef({
  id: 'geodataset-management',
  messages: {
    tabs: {
      dataOwner: 'Data Owner',
      contactPerson: 'Contact Person',
      myProposals: 'My Proposals',
      manageActiveProposals: 'Manage Active Proposals',
      managementAgreement: 'Management Agreement',
    },
    toolbar: {
      search: 'Search',
      filter: 'Filter',
      columns: 'Columns',
      addView: 'Add View',
      listView: 'List View',
      gridView: 'Grid View',
    },
    views: {
      standard: 'Standard View',
      compact: 'Compact View',
      detailed: 'Detailed View',
    },
    pagination: {
      show: 'Show',
      rowsOf: 'rows of',
      showDeleted: 'Show Deleted',
    },
    table: {
      signatureStatus: 'Signature Status',
      title: 'Title',
      protectionClass: 'Protection Class',
      summary: 'Summary',
      openData: 'Open Data',
      moreOptions: 'More Options',
    },
    pageTitle: {
      dataOwner: 'Data Owner',
    },
    content: {
      contactPerson: 'Contact Person Content',
      myProposals: 'My Proposals Content',
      manageActiveProposals: 'Manage Active Proposals Content',
      managementAgreement: 'Management Agreement Content',
    },
  },
});
