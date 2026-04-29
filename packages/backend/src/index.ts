/*
 * Hi!
 *
 * Note that this is an EXAMPLE Backstage backend. Please check the README.
 *
 * Happy hacking!
 */

import dotenv from 'dotenv';
import path from 'path';

//Make sure to load before any config-related imports
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createBackend } from '@backstage/backend-defaults';
import {
  geoportiaMetadataBackendModule,
  scaffolderModuleGeoportiaMetadata,
  geoportiaPermissionPolicyModule,
} from '@internal/backstage-plugin-geoportia-metadata-backend';

const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend'));
backend.add(import('@backstage/plugin-proxy-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend'));
backend.add(import('@backstage/plugin-scaffolder-backend-module-github'));
backend.add(import('@backstage/plugin-techdocs-backend'));

// auth plugin
backend.add(import('@backstage/plugin-auth-backend'));
// See https://backstage.io/docs/backend-system/building-backends/migrating#the-auth-plugin
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
// See https://backstage.io/docs/auth/guest/provider
backend.add(import('@backstage/plugin-auth-backend-module-github-provider'));

// catalog plugin
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(
  import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'),
);

// See https://backstage.io/docs/features/software-catalog/configuration#subscribing-to-catalog-errors
backend.add(import('@backstage/plugin-catalog-backend-module-logs'));

// permission plugin
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(geoportiaPermissionPolicyModule);

// search plugin
backend.add(import('@backstage/plugin-search-backend'));

// search engine
// See https://backstage.io/docs/features/search/search-engines
backend.add(import('@backstage/plugin-search-backend-module-pg'));

// search collators
backend.add(import('@backstage/plugin-search-backend-module-catalog'));
backend.add(import('@backstage/plugin-search-backend-module-techdocs'));

// kubernetes
backend.add(import('@backstage/plugin-kubernetes-backend'));

backend.add(import('@internal/backstage-plugin-catalog-backend-module-postgresql-data'));
backend.add(import('@internal/backstage-plugin-geoportia-metadata-backend'));
backend.add(geoportiaMetadataBackendModule);
backend.add(scaffolderModuleGeoportiaMetadata);
backend.add(import('@internal/backstage-plugin-catalog-backend-module-fmeflow'));
backend.add(import('@internal/backstage-plugin-catalog-backend-module-geoserver'));
backend.add(import('@internal/backstage-plugin-catalog-backend-module-arcgis-sde-data'));
backend.start();
