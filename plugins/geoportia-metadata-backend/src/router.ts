import express, { Router } from 'express';
import { HttpAuthService, PermissionsService, UserInfoService } from '@backstage/backend-plugin-api';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { createOpenApiRouter } from './schema/openapi';
import {
  MetadataEntryCreate,
  MetadataEntryUpdate,
  MetadataService,
} from './services/MetadataService/types';
import { SuggestionService } from './services/SuggestionService/types';
import {
  metadataEntryCreatePermission,
  metadataEntryUpdatePermission,
  metadataEntryDeletePermission,
} from '@internal/backstage-plugin-geoportia-metadata-common';
import { hasAdminLikeRole } from './permissions/roles';
import { z } from 'zod';
import {
  ArcgisSdeDatabases,
  createArcgisSdeDataset,
} from './arcgisSde/arcgisSdeConfig';
import { NotFoundError, InputError } from '@backstage/errors';
import { arcGISSDEProviderRegistry } from '@internal/backstage-plugin-catalog-backend-module-arcgis-sde-data';

export async function createRouter({
  httpAuth,
  userInfo,
  metadataService,
  suggestionService,
  permissions,
  arcgisSdeDatabases,
}: {
  httpAuth: HttpAuthService;
  userInfo: UserInfoService;
  metadataService: MetadataService;
  suggestionService: SuggestionService;
  permissions: PermissionsService;
  arcgisSdeDatabases: ArcgisSdeDatabases;
}): Promise<express.Router> {
  const parentRouter = Router();
  parentRouter.use(express.json());

  const openApiRouter = await createOpenApiRouter();

  parentRouter.put('/:entityRef/deleted', async (req, res, next) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const entityRef = decodeURIComponent(req.params.entityRef);

      // Soft-delete reuses the update permission.
      const decision = await permissions.authorize(
        [{ permission: metadataEntryUpdatePermission, resourceRef: entityRef }],
        { credentials },
      );
      if (decision[0].result !== AuthorizeResult.ALLOW) {
        res.status(403).send();
        return;
      }

      const body = z.object({ deleted: z.boolean() }).parse(req.body);

      const result = await metadataService.setMetadataEntryDeleted(
        { entityRef, deleted: body.deleted },
        { credentials },
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  parentRouter.get('/:entityRef', async (req, res, next) => {
    // Skip to OpenAPI router for paths it handles
    if (req.params.entityRef?.includes('/') || req.params.entityRef === 'suggestions') {
      return next();
    }
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const entityRef = decodeURIComponent(req.params.entityRef);

      const result = await metadataService.getMetadataEntry(entityRef, {
        credentials,
      });

      if (!result) {
        res.status(404).json({ error: 'Metadata entry not found' });
        return;
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  openApiRouter.post('/', async (req, res, next) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });

      // Check create permission
      const decision = await permissions.authorize(
        [{ permission: metadataEntryCreatePermission }],
        { credentials },
      );
      if (decision[0].result !== AuthorizeResult.ALLOW) {
        res.status(403).send();
        return;
      }

      const body = z
        .object({
          entityRef: z.string().min(1),
          schema: z.unknown(),
          metadata: z.unknown(),
        })
        .parse(req.body) as MetadataEntryCreate;

      const result = await metadataService.createMetadataEntry(body, {
        credentials,
      });

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  openApiRouter.put('/:entityRef', async (req, res, next) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const entityRef = decodeURIComponent(req.params.entityRef);

      // Check update permission (resource-based)
      const decision = await permissions.authorize(
        [{ permission: metadataEntryUpdatePermission, resourceRef: entityRef }],
        { credentials },
      );
      if (decision[0].result !== AuthorizeResult.ALLOW) {
        res.status(403).send();
        return;
      }

      const body = z
        .object({
          schema: z.unknown(),
          metadata: z.unknown(),
        })
        .parse(req.body) as Omit<MetadataEntryUpdate, 'entityRef'>;

      const result = await metadataService.updateMetadataEntry(
        { entityRef, ...body },
        { credentials },
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  openApiRouter.delete('/:entityRef', async (req, res, next) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const entityRef = decodeURIComponent(req.params.entityRef);

      // Check delete permission (resource-based)
      const decision = await permissions.authorize(
        [{ permission: metadataEntryDeletePermission, resourceRef: entityRef }],
        { credentials },
      );
      if (decision[0].result !== AuthorizeResult.ALLOW) {
        res.status(403).send();
        return;
      }

      await metadataService.deleteMetadataEntry({ entityRef }, { credentials });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  openApiRouter.get('/suggestions', async (req, res, next) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const info = await userInfo.getUserInfo(credentials);

      const ownershipRefs = info.ownershipEntityRefs;
      const userEntityRef = info.userEntityRef;
      const isAdmin = hasAdminLikeRole(ownershipRefs);

      const suggestions = await suggestionService.getAllSuggestions({
        credentials,
        userEntityRef,
        isAdmin,
      });

      res.json(
        suggestions.map(s => ({
          ...s,
          createdAt: new Date(s.createdAt),
        })),
      );
    } catch (error) {
      next(error);
    }
  });

  openApiRouter.get('/:entityRef/suggestions', async (req, res, next) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const entityRef = decodeURIComponent(req.params.entityRef);

      const suggestions = await suggestionService.getSuggestions(entityRef, {
        credentials,
      });

      res.json(suggestions.map(s => ({
        ...s,
        createdAt: new Date(s.createdAt),
      })));
    } catch (error) {
      next(error);
    }
  });

  openApiRouter.post('/:entityRef/suggestions/:id/accept', async (req, res, next) => {
    try {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });
      const entityRef = decodeURIComponent(req.params.entityRef);
      const suggestionId = req.params.id;

      // Check update permission (resource-based) since accepting a suggestion updates the metadata
      const decision = await permissions.authorize(
        [{ permission: metadataEntryUpdatePermission, resourceRef: entityRef }],
        { credentials },
      );
      if (decision[0].result !== AuthorizeResult.ALLOW) {
        res.status(403).send();
        return;
      }

      const result = await suggestionService.acceptSuggestion(suggestionId, {
        credentials,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  parentRouter.use(openApiRouter);

  // GET /arcgis-sde/databases
  // Returns the list of database resource names that have ArcGIS SDE proxy
  // credentials configured. The UI uses this to disable the
  // "create dataset" button for non-SDE databases.
  parentRouter.get('/arcgis-sde/databases', async (req, res, next) => {
    try {
      await httpAuth.credentials(req, { allow: ['user'] });
      res.json({ items: Object.keys(arcgisSdeDatabases) });
    } catch (error) {
      next(error);
    }
  });

  // POST /arcgis-sde/databases/:database/datasets
  // Creates a new feature dataset in the configured ArcGIS SDE database via
  // the python proxy. Admin credentials never leave the backend.
  parentRouter.post(
    '/arcgis-sde/databases/:database/datasets',
    async (req, res, next) => {
      try {
        await httpAuth.credentials(req, { allow: ['user'] });

        const body = z
          .object({
            datasetName: z.string().min(1),
            spatialReferenceWkid: z.number().int().positive().optional(),
            versioning: z
              .enum(['NONE', 'TRADITIONAL', 'BRANCH'])
              .optional(),
            isTraditionalVersioned: z.boolean().optional(),
            isBranchVersioned: z.boolean().optional(),
            allowZValues: z.boolean().optional(),
            zExtent: z
              .object({
                min: z.number(),
                max: z.number(),
              })
              .optional(),
          })
          .parse(req.body);

        // Derive enum from booleans if a client only sent the booleans,
        // and vice versa, so both representations stay in sync downstream.
        const versioning: 'NONE' | 'TRADITIONAL' | 'BRANCH' | undefined =
          body.versioning ??
          (body.isTraditionalVersioned
            ? 'TRADITIONAL'
            : body.isBranchVersioned
              ? 'BRANCH'
              : undefined);

        const result = await createArcgisSdeDataset(arcgisSdeDatabases, {
          databaseResourceName: decodeURIComponent(req.params.database),
          datasetName: body.datasetName,
          spatialReferenceWkid: body.spatialReferenceWkid,
          versioning,
          isTraditionalVersioned:
            body.isTraditionalVersioned ?? versioning === 'TRADITIONAL',
          isBranchVersioned:
            body.isBranchVersioned ?? versioning === 'BRANCH',
          allowZValues: body.allowZValues,
          zExtent: body.zExtent,
        });

        // Trigger Entity Provider refresh so the new dataset appears in the catalog
        const databaseName = decodeURIComponent(req.params.database);
        arcGISSDEProviderRegistry.refreshProvider(databaseName).catch(() => {
          // best-effort refresh, don't fail the request if this fails
        });

        res.status(201).json(result);
      } catch (error) {
        if (error instanceof NotFoundError) {
          res.status(404).json({ error: error.message });
          return;
        }
        if (error instanceof InputError) {
          res.status(400).json({ error: error.message });
          return;
        }
        next(error);
      }
    },
  );

  // POST /arcgis-sde/databases/:database/refresh
  // Manually triggers the Entity Provider to re-sync datasets from SDE.
  parentRouter.post(
    '/arcgis-sde/databases/:database/refresh',
    async (req, res, next) => {
      try {
        await httpAuth.credentials(req, { allow: ['user'] });

        const databaseName = decodeURIComponent(req.params.database);
        const refreshed = await arcGISSDEProviderRegistry.refreshProvider(
          databaseName,
        );

        if (!refreshed) {
          res.status(404).json({
            error: `No Entity Provider registered for database "${databaseName}".`,
          });
          return;
        }

        res.json({ success: true, database: databaseName });
      } catch (error) {
        next(error);
      }
    },
  );

  return parentRouter;
}
