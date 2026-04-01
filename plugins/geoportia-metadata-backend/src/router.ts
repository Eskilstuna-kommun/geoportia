import { HttpAuthService } from '@backstage/backend-plugin-api';
import express from 'express';
import { createOpenApiRouter } from './schema/openapi';
import {
  MetadataEntryCreate,
  MetadataEntryUpdate,
  MetadataService,
} from './services/MetadataService/types';
import { z } from 'zod';

export async function createRouter({
  httpAuth,
  metadataService,
}: {
  httpAuth: HttpAuthService;
  metadataService: MetadataService;
}): Promise<express.Router> {
  const router = await createOpenApiRouter();

  router.post('/', async (req, res) => {
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

  router.put('/:entityRef', async (req, res) => {
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

  router.delete('/:entityRef', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const entityRef = decodeURIComponent(req.params.entityRef);
    await metadataService.deleteMetadataEntry({ entityRef }, { credentials });
    res.status(204).send();
  });

  return router;
}
