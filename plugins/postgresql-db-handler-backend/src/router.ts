import { HttpAuthService } from '@backstage/backend-plugin-api';
import { InputError } from '@backstage/errors';
import express from 'express';
import Router from 'express-promise-router';
import { z } from 'zod';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { PostgreSQLDatabaseService } from './services/PostgreSQLDatabaseService';

type CatalogService = typeof catalogServiceRef.T;

const geoportiaPostgresApiVersion = 'geoportia.se/v1alpha1';

// Mirror exclusions from the old direct-SQL implementation.
const excludedViews = new Set(['geography_columns', 'geometry_columns']);
const excludedTables = new Set(['spatial_ref_sys']);

const schemaParamsSchema = z.object({
  schemaName: z.string().min(1, 'schemaName is required'),
});

const schemaAndTableParamsSchema = z.object({
  schemaName: z.string().min(1, 'schemaName is required'),
  tableName: z.string().min(1, 'tableName is required'),
});

const credentials = async (httpAuth: HttpAuthService, req: express.Request) => {
  return await httpAuth.credentials(req, {
      allow: ['user', 'service'],
    });
} 

export async function createRouter({
  httpAuth,
  catalog,
  dbService,
}: {
  httpAuth: HttpAuthService;
  catalog: CatalogService;
  dbService: PostgreSQLDatabaseService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());
  
  router.post('/create-view', async (_req, res) => {
  const info = await dbService.createView(
      _req.body.viewName,
      _req.body.schemaName,
      _req.body.tables,
    );
    res.status(200).send({ message: 'View created successfully', info });
  });

  router.get('/list-views/:schemaName', async (req, res) => {
    const { schemaName } = schemaParamsSchema.parse(req.params);
  
    const { items } = await catalog.getEntities(
      {
        filter: {
          kind: 'View',
        },
      },
      { credentials: await credentials(httpAuth, req) },
    );

    const views = items
      .filter(e => e.apiVersion === geoportiaPostgresApiVersion)
      .filter(e => (e.spec as any)?.schemaName === schemaName)
      .map(e => (e.spec as any)?.name)
      .filter(
        (name): name is string => typeof name === 'string' && name.length > 0,
      )
      .filter(name => !excludedViews.has(name.toLowerCase()))
      .sort();

    res.status(200).send({ views });
  });

  router.get('/list-tables/:schemaName', async (req, res) => {
    const { schemaName } = schemaParamsSchema.parse(req.params);

    const { items } = await catalog.getEntities(
      {
        filter: {
          kind: 'Table',
        },
      },
      { credentials: await credentials(httpAuth, req) },
    );

    const tables = items
      .filter(e => e.apiVersion === geoportiaPostgresApiVersion)
      .filter(e => (e.spec as any)?.schemaName === schemaName)
      .map(e => (e.spec as any)?.name)
      .filter(
        (name): name is string => typeof name === 'string' && name.length > 0,
      )
      .filter(name => !excludedTables.has(name.toLowerCase()))
      .sort();

    res.status(200).send({ tables });
  });

  router.get('/list-columns/:schemaName/:tableName', async (req, res) => {
    const { schemaName, tableName } = schemaAndTableParamsSchema.parse(
      req.params,
    );

    const fetchEntity = async (kind: 'Table' | 'View') => {
      const { items } = await catalog.getEntities(
        {
          filter: {
            kind,
          },
        },
        { credentials: await credentials(httpAuth, req) },
      );

      return items.find(
        e =>
          e.apiVersion === geoportiaPostgresApiVersion &&
          (e.spec as any)?.schemaName === schemaName &&
          (e.spec as any)?.name === tableName,
      );
    };

    const entity = (await fetchEntity('Table')) ?? (await fetchEntity('View'));
    if (!entity) {
      throw new InputError(
        `No Table/View entity found for ${schemaName}.${tableName} in the catalog`,
      );
    }

    const columns = ((entity.spec as any)?.columns ?? [])
      .map((c: any) => c?.name)
      .filter(
        (name: any): name is string => typeof name === 'string' && name.length > 0,
      );

    res.status(200).send({ columns });
  });

  router.delete('/delete-view/:schemaName/:viewName', async (_req, res) => {
   await dbService.deleteView(_req.params.viewName, _req.params.schemaName);
    res.status(200).send({ message: 'View deleted successfully' });
  });

  return router;
}
