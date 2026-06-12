
export const DISPLAY_FIELD_PATHS = {
  title: ['generalInfo.title', 'layerInfo.title', 'title'],
  summary: ['generalInfo.summary', 'layerInfo.sammanfattning', 'summary', 'description'],
  subjectArea: ['generalInfo.subjectArea', 'nestedMetadata.subjectArea'],
  geographicExtent: ['generalInfo.geographicExtent'],
  metadataStatus: ['generalInfo.metadataStatus', 'status'],

  // Data source fields
  database: ['dataSource.database', 'databaseInfo.database'],
  dataType: ['dataSource.dataType', 'databaseInfo.dataType'],
  dataset: ['dataSource.vector.dataset', 'databaseInfo.dataset'],

  // Ownership fields
  owner: ['ownership.owner', 'layerInfo.suggestedOwnerEnhet'],
  metadataContact: ['ownership.metadataContact', 'layerInfo.contactPerson'],
  maintenanceFrequency: ['ownership.maintenanceFrequency'],
  archiveOption: ['ownership.archiveOption'],
  datasetStatus: ['ownership.datasetStatus'],
  managementAgreementDate: ['ownership.managementAgreementDate'],

  // History fields
  source: ['history.source', 'nestedMetadata.source'],
  quality: ['history.quality', 'nestedMetadata.quality'],
  dataCollectionMethod: ['history.dataCollectionMethod', 'nestedMetadata.dataCollectionMethod'],
  processingSteps: ['history.processingSteps', 'nestedMetadata.processingMethod'],

  // Security fields
  securityClass: ['security.securityClass', 'nestedMetadata.securityClass'],
  personalData: ['security.personalData'],
  openData: ['security.openData', 'layerInfo.openData'],

  // Legacy layer info (for old GeoServer-based entries)
  layerName: ['layerInfo.layerName'],
  suggestedTitle: ['layerInfo.suggestedTitle'],
} as const;

export type DisplayFieldKey = keyof typeof DISPLAY_FIELD_PATHS;

export const DISCRIMINATOR_MAPPINGS: Record<string, Record<string, string>> = {
  dataType: {
    Raster: 'raster',
    Vektor: 'vector',
    Tabell: 'table',
  },
  fileType: {
    Raster: 'raster',
    'Filbaserad databas': 'fileBasedDatabase',
    Fil: 'file',
  },
};

/**
 * Default placeholder values (used as fallback when translations not available).
 * The actual check uses translations via `usePlaceholderValues` hook.
 */
export const DEFAULT_PLACEHOLDER_VALUES = ['Välj...', '', 'Välj', '—'];

/**
 * Translation keys for placeholder values.
 * These are looked up via the translation function to support i18n.
 */
export const PLACEHOLDER_TRANSLATION_KEYS = [
  'placeholders.select',
  'placeholders.selectEllipsis',
  'placeholders.dash',
] as const;
