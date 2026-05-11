import { createTranslationRef } from '@backstage/core-plugin-api/alpha';

/** @public */
export const geoportiaMetadataTranslationRef = createTranslationRef({
  id: 'plugin.geoportia-metadata',
  messages: {
    suggestionsTable: {
      title: 'Suggested changes',
      columns: {
        id: 'ID',
        suggestedBy: 'Suggested by',
        date: 'Date',
      },
      emptyState: 'No change suggestions have been created for this metadata entry.',
      loading: 'Loading suggestions...',
    },
    suggestionDetail: {
      title: 'Change suggestion',
      changedFields: 'changed fields',
      fieldComparison: 'Field comparison',
      columns: {
        field: 'Field',
        current: 'Current',
        suggested: 'Suggested',
      },
      changedBadge: 'Changed',
      emptyValue: '(empty)',
      emptyList: '(empty list)',
      booleanYes: 'Yes',
      booleanNo: 'No',
      buttons: {
        close: 'Close',
        accept: 'Accept changes',
      },
      acceptSuccess: 'The change suggestion has been accepted!',
      acceptError: 'An error occurred while accepting',
      fetchError: 'Could not fetch existing metadata',
    },
    metadataField: {
      loading: 'Loading existing metadata...',
      selectEntityPrompt: 'Select a metadata entry above to view and edit its metadata',
      suggestedByLabel: 'Suggested by:',
      unknownUser: 'Unknown user',
      noSchemaError: 'Error: No geoportiaMetadataSchema defined in ui:options',
    },
    metadataViewer: {
      saved: 'Metadata saved!',
      saveError: 'An error occurred while saving',
      buttons: {
        cancel: 'Cancel',
        save: 'Save',
        edit: 'Edit',
      },
      addItem: 'Add',
    },
    common: {
      error: 'Error',
    },
  },
});
