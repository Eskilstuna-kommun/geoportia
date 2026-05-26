import express, { Router } from 'express';
import { HttpAuthService, PermissionsService } from '@backstage/backend-plugin-api';
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
import { z } from 'zod';
import {
  ArcgisSdeDatabases,
  createArcgisSdeDataset,
} from './arcgisSde/arcgisSdeConfig';
import { NotFoundError, InputError } from '@backstage/errors';

export async function createRouter({
  httpAuth,
  metadataService,
  suggestionService,
  permissions,
  arcgisSdeDatabases,
}: {
  httpAuth: HttpAuthService;
  metadataService: MetadataService;
  suggestionService: SuggestionService;
  permissions: PermissionsService;
  arcgisSdeDatabases: ArcgisSdeDatabases;
}): Promise<express.Router> {
  const parentRouter = Router();
  parentRouter.use(express.json());

  const openApiRouter = await createOpenApiRouter();

  parentRouter.get('/:entityRef', async (req, res, next) => {
    if (req.params.entityRef?.includes('/')) {
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
          })
          .parse(req.body);

        const result = await createArcgisSdeDataset(arcgisSdeDatabases, {
          databaseResourceName: decodeURIComponent(req.params.database),
          datasetName: body.datasetName,
          spatialReferenceWkid: body.spatialReferenceWkid,
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

  return parentRouter;
}
