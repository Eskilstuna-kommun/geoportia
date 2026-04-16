import { HttpAuthService } from '@backstage/backend-plugin-api';
import express, { Router, Request, Response, NextFunction } from 'express';
import { createOpenApiRouter } from './schema/openapi';
import {
  MetadataEntryCreate,
  MetadataEntryUpdate,
  MetadataService,
  DatasetCreate,
} from './services/MetadataService/types';
import { z } from 'zod';

export async function createRouter({
  httpAuth,
  metadataService,
}: {
  httpAuth: HttpAuthService;
  metadataService: MetadataService;
}): Promise<express.Router> {
  const parentRouter = Router();
  parentRouter.use(express.json());

  parentRouter.get('/datasets', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const datasets = await metadataService.getDatasetsPublic();
      res.json(datasets);
    } catch (error) {
      next(error);
    }
  });

  parentRouter.post('/datasets', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const credentials = await httpAuth.credentials(req as any, { allow: ['user', 'service'] });

      const body = z
        .object({
          name: z.string().min(1),
          summary: z.string().optional(),
          versioning: z.enum(['Ej versionerad', 'Versionerad']).optional(),
          allowZValues: z.boolean().optional(),
          status: z.enum(['Godkänd', 'Utkast', 'Under granskning', 'Avvisad']).optional(),
        })
        .parse(req.body) as DatasetCreate;

      const result = await metadataService.createDataset(body, { credentials: credentials as any });
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  const openApiRouter = await createOpenApiRouter();

  openApiRouter.post('/', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });

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
  });

  openApiRouter.put('/:entityRef', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const entityRef = decodeURIComponent(req.params.entityRef);

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
  });

  openApiRouter.delete('/:entityRef', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const entityRef = decodeURIComponent(req.params.entityRef);
    await metadataService.deleteMetadataEntry({ entityRef }, { credentials });
    res.status(204).send();
  });

  // Mount the OpenAPI router under the parent router
  parentRouter.use(openApiRouter);

  return parentRouter;
}
