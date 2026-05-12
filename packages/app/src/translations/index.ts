import { catalogTranslationRef } from '@backstage/plugin-catalog/alpha';
import { catalogReactTranslationRef } from '@backstage/plugin-catalog-react/alpha';
import { catalogImportTranslationRef } from '@backstage/plugin-catalog-import/alpha';
import { scaffolderTranslationRef } from '@backstage/plugin-scaffolder/alpha';
import { scaffolderReactTranslationRef } from '@backstage/plugin-scaffolder-react/alpha';
import { searchTranslationRef } from '@backstage/plugin-search/alpha';
import { searchReactTranslationRef } from '@backstage/plugin-search-react/alpha';
import { userSettingsTranslationRef } from '@backstage/plugin-user-settings/alpha';
import { apiDocsTranslationRef } from '@backstage/plugin-api-docs/alpha';
import { createTranslationResource } from '@backstage/core-plugin-api/alpha';
import { geoportiaMetadataTranslationRef } from '@internal/backstage-plugin-geoportia-metadata';

import catalogSv from './catalog-sv.json';
import catalogReactSv from './catalog-react-sv.json';
import catalogImportSv from './catalog-import-sv.json';
import scaffolderSv from './scaffolder-sv.json';
import scaffolderReactSv from './scaffolder-react-sv.json';
import searchSv from './search-sv.json';
import searchReactSv from './search-react-sv.json';
import userSettingsSv from './user-settings-sv.json';
import apiDocsSv from './api-docs-sv.json';
import geoportiaSv from './geoportia-sv.json';
import geoportiaMetadataSv from './geoportia-metadata-sv.json';
import geodatasetManagementSv from './geodataset-management-sv.json';

import { geoportiaTranslationRef } from './geoportia-translation';
import { geodatasetManagementTranslationRef } from '@internal/backstage-plugin-geodataset-management';

export { geoportiaTranslationRef } from './geoportia-translation';

export const catalogTranslationsSv = createTranslationResource({
  ref: catalogTranslationRef,
  translations: { sv: () => Promise.resolve({ default: catalogSv }) },
});

export const catalogReactTranslationsSv = createTranslationResource({
  ref: catalogReactTranslationRef,
  translations: { sv: () => Promise.resolve({ default: catalogReactSv }) },
});

export const catalogImportTranslationsSv = createTranslationResource({
  ref: catalogImportTranslationRef,
  translations: { sv: () => Promise.resolve({ default: catalogImportSv }) },
});

export const scaffolderTranslationsSv = createTranslationResource({
  ref: scaffolderTranslationRef,
  translations: { sv: () => Promise.resolve({ default: scaffolderSv }) },
});

export const scaffolderReactTranslationsSv = createTranslationResource({
  ref: scaffolderReactTranslationRef,
  translations: { sv: () => Promise.resolve({ default: scaffolderReactSv }) },
});

export const searchTranslationsSv = createTranslationResource({
  ref: searchTranslationRef,
  translations: { sv: () => Promise.resolve({ default: searchSv }) },
});

export const searchReactTranslationsSv = createTranslationResource({
  ref: searchReactTranslationRef,
  translations: { sv: () => Promise.resolve({ default: searchReactSv }) },
});

export const userSettingsTranslationsSv = createTranslationResource({
  ref: userSettingsTranslationRef,
  translations: { sv: () => Promise.resolve({ default: userSettingsSv }) },
});

export const apiDocsTranslationsSv = createTranslationResource({
  ref: apiDocsTranslationRef,
  translations: { sv: () => Promise.resolve({ default: apiDocsSv }) },
});

export const geoportiaTranslationsSv = createTranslationResource({
  ref: geoportiaTranslationRef,
  translations: { sv: () => Promise.resolve({ default: geoportiaSv }) },
});

export const geoportiaMetadataTranslationsSv = createTranslationResource({
  ref: geoportiaMetadataTranslationRef,
  translations: { sv: () => Promise.resolve({ default: geoportiaMetadataSv }) },
});

export const geodatasetManagementTranslationsSv = createTranslationResource({
  ref: geodatasetManagementTranslationRef,
  translations: { sv: () => Promise.resolve({ default: geodatasetManagementSv }) },
});

export const allSwedishTranslations = [
  catalogTranslationsSv,
  catalogReactTranslationsSv,
  catalogImportTranslationsSv,
  scaffolderTranslationsSv,
  scaffolderReactTranslationsSv,
  searchTranslationsSv,
  searchReactTranslationsSv,
  userSettingsTranslationsSv,
  apiDocsTranslationsSv,
  geoportiaTranslationsSv,
  geoportiaMetadataTranslationsSv,
  geodatasetManagementTranslationsSv,
];

