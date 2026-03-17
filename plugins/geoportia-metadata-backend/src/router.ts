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
  const router = (await createOpenApiRouter()) as express.Router;

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

  router.get('/data/:database/:table/preview', async (req, res) => {
    const result = await metadataService.preview({
      database: req.params.database,
      name: req.params.table,
    });

    res.json(result);
  });

  router.get('/databasspecifikation/:database/:table', async (req, res) => {
    const result = await metadataService.getTable({
      database: req.params.database,
      name: req.params.table,
    });

    res.json(result);
  });
  router.get(
    '/databasspecifikation/:database/:table/:version',
    async (req, res) => {
      const result = await metadataService.getTableAtVersion({
        database: req.params.database,
        name: req.params.table,
        version: Number.parseInt(req.params.version, 10),
      });

      res.json(result);
    },
  );
  router.post('/databasspecifikation/:database/:table', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });

    const result = await metadataService.createTableVersion(
      {
        database: req.params.database,
        name: req.params.table,
        version: 1,
        properties: req.body.properties,
        attributes: req.body.attributes,
        title: req.body.title,
        active: false,
        owner: req.body.owner,
      },
      { credentials },
    );

    res.json(result);
  });
  router.post(
    '/databasspecifikation/:database/:table/:version/activate',
    async (req, res) => {
      const credentials = await httpAuth.credentials(req, { allow: ['user'] });

      const result = await metadataService.activateTableVersion(
        {
          database: req.params.database,
          name: req.params.table,
          version: Number.parseInt(req.params.version, 10),
        },
        { credentials },
      );

      res.json(result);
    },
  );

  return router;
}
