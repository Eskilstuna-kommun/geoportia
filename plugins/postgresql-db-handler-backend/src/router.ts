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
    const result = await dbService.createView(
      _req.body.viewName,
      _req.body.schemaName,
      _req.body.tables,
    );
    if (result.successful) {
      res.status(200).send({ message: 'View created successfully.' });
    } else {
      res.status(400).send({ message: `Error: ${result.message}` });
    }
  });

  router.get('/list-views/:schemaName', async (_req, res) => {
    const result = await dbService.getViews(_req.params.schemaName);
    if (!result.successful) {
      res.status(400).send({ views: [], message: `Error: ${result.message}` });
      return;
    }
    res.status(200).send({ message: result.message, views: result.views });
  });

  router.get('/list-tables/:schemaName', async (_req, res) => {
    const result = await dbService.getTables(_req.params.schemaName);
    if (!result.successful) {
      res.status(400).send({ tables: [], message: `Error: ${result.message}` });
      return;
    }
    res.status(200).send({ message: result.message, tables: result.tables });
  });

  router.get('/list-columns/:schemaName/:tableName', async (_req, res) => {
    const result = await dbService.getTableColumns(
      _req.params.tableName,
      _req.params.schemaName,
    );
    if (!result.successful) {
      res.status(400).send({ columns: [], message: `Error: ${result.message}` });
      return;
    }
    res.status(200).send({ message: result.message, columns: result.columns });
  });

  router.delete('/delete-view/:schemaName/:viewName', async (_req, res) => {
    const result = await dbService.deleteView(_req.params.viewName, _req.params.schemaName);
    if (!result.successful) {
      res.status(400).send({ message: `Error: ${result.message}` });
      return;
    }
    res.status(200).send({ message: 'View deleted successfully' });
  });

  return router;
}
