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
      fetchError: 'Error fetching metadata',
    },
    scaffolder: {
      datasetSelect: {
        loadingDatasets: 'Loading datasets...',
        fetchError: 'Fetch error: {{message}}',
        selectDatabaseHelper: 'Select a database to see available datasets',
        createButton: 'Create new dataset',
        createTooltipNoDatabase:
          'Select a database first to create a dataset',
        optionPending: 'created – waiting for indexing',
        optionPendingShort: 'waiting for indexing',
        modal: {
          title: 'Create new dataset',
          description:
            'Creates a new feature dataset in the ArcGIS SDE database {{database}} via the python proxy.',
          name: 'Name',
          namePlaceholder: 'e.g. MyDataset',
          nameHelper:
            'Letters, digits and underscores. Must start with a letter or underscore.',
          descriptionField: 'Description',
          descriptionPlaceholder: 'Short description of the dataset',
          database: 'Database',
          versioning: 'Versioning',
          versioningSelect: 'Select...',
          versioningNone: 'Not versioned',
          versioningTraditional: 'Traditional versioned',
          versioningBranch: 'Branch-versioned',
          allowZValues: 'Allow Z values',
          zMin: 'Z min',
          zMax: 'Z max',
          zExtentHelper: 'Z domain applied to the dataset spatial reference.',
          status: 'Status',
          statusSelect: 'Select...',
          statusToBeSet: 'To be set',
          statusDeleted: 'Deleted',
          statusSuggested: 'Suggested',
          statusApproved: 'Approved',
          statusToBeUnpublished: 'To be unpublished',
          databaseSpecifications: 'Database specifications',
          save: 'Save',
          back: 'Back',
          errorNoDatabase: 'Select a database before creating a dataset.',
          errorDatasetNameRequired: 'Name is required.',
          errorCreateFailed:
            'Could not create dataset ({{status}} {{statusText}}): {{body}}',
          errorNotSdeBacked:
            'The selected database is not backed by an ArcGIS SDE proxy and cannot create datasets.',
          errorZExtentInvalid:
            'Z min must be smaller than Z max.',
        },
      },
      tableSelect: {
        placeholder: 'Select a table...',
        loadingTables: 'Loading tables...',
        selectDatabaseHelper: 'Select a database to see available tables',
        noTables: 'No tables found for the selected database',
      },
      groupSelect: {
        placeholder: 'Search group...',
        placeholderMultiple: 'Search and select groups...',
      },
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
