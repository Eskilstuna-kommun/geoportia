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

export async function createRouter({
  httpAuth,
  metadataService,
  suggestionService,
  permissions,
}: {
  httpAuth: HttpAuthService;
  metadataService: MetadataService;
  suggestionService: SuggestionService;
  permissions: PermissionsService;
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

  return parentRouter;
}
