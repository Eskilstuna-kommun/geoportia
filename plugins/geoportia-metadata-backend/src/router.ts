import { HttpAuthService } from '@backstage/backend-plugin-api';
import express from 'express';
import { createOpenApiRouter } from './schema/openapi';
import { MetadataService } from './services/MetadataService/types';

export async function createRouter({
  httpAuth,
  metadataService,
}: {
  httpAuth: HttpAuthService;
  metadataService: MetadataService;
}): Promise<express.Router> {
  const router = await createOpenApiRouter();

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
        version: req.params.version,
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
          version: req.params.version,
        },
        { credentials },
      );

      res.json(result);
    },
  );

  return router;
}
