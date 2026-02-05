import { Router } from 'express';
import express from 'express';
import { PostgreSQLDatabaseHandler } from './PostgreSQLDatabaseHandler';
import { LoggerService } from '@backstage/backend-plugin-api';

export async function createRouter(host: string, port: number, database: string, user: string, password: string, logger: LoggerService,
): Promise<Router> {
    const dbHandler = new PostgreSQLDatabaseHandler(
        host,
        port,
        database,
        user,
        password,
        logger,
    );
  const router = express.Router();

  router.post('/create-view', async (_req, res) => {
    const info = await dbHandler.createView(
      _req.body.viewName,
      _req.body.schemaName,
      _req.body.tables,
    );
    res.status(200).send({ message: 'View created successfully', info });
  });

  router.get('/list-views/:schemaName', async (_req, res) => {
    const views = await dbHandler.getViews(_req.params.schemaName);
    res.status(200).send({ views });
  });

  router.get('/list-tables/:schemaName', async (_req, res) => {
    const tables = await dbHandler.getTables(_req.params.schemaName);
    res.status(200).send({ tables });
  });

  router.get('/list-columns/:schemaName/:tableName', async (_req, res) => {
    const columns = await dbHandler.getTableColumns(
      _req.params.tableName,
      _req.params.schemaName,
    );
    res.status(200).send({ columns });
  });

  router.delete('/delete-view/:schemaName/:viewName', async (_req, res) => {
    await dbHandler.deleteView(
      _req.params.viewName,
      _req.params.schemaName,
    );
    res.status(200).send({ message: 'View deleted successfully' });
  });

  return router;
}
