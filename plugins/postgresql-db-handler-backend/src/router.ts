import express from 'express';
import Router from 'express-promise-router';
import { PostgreSQLDatabaseService } from './services/PostgreSQLDatabaseService';

export async function createRouter({
  dbService,
}: {
  dbService: PostgreSQLDatabaseService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  router.post('/create-view', async (_req, res) => {
    const viewCreated = await dbService.createView(
      _req.body.viewName,
      _req.body.schemaName,
      _req.body.tables,
    );
    if (viewCreated) {
      res.status(200).send({ message: 'View created successfully.' });
    } else {
      res.status(400).send({ message: 'Error: view could not be created.' });
    }
  });

  router.get('/list-views/:schemaName', async (_req, res) => {
    const views = await dbService.getViews(_req.params.schemaName);
    res.status(200).send({ views });
  });

  router.get('/list-tables/:schemaName', async (_req, res) => {
    const tables = await dbService.getTables(_req.params.schemaName);
    res.status(200).send({ tables });
  });

  router.get('/list-columns/:schemaName/:tableName', async (_req, res) => {
    const columns = await dbService.getTableColumns(
      _req.params.tableName,
      _req.params.schemaName,
    );
    res.status(200).send({ columns });
  });

  router.delete('/delete-view/:schemaName/:viewName', async (_req, res) => {
    await dbService.deleteView(_req.params.viewName, _req.params.schemaName);
    res.status(200).send({ message: 'View deleted successfully' });
  });

  return router;
}
