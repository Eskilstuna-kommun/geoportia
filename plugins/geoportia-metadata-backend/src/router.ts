import { HttpAuthService } from '@backstage/backend-plugin-api';
import express, { Router, Request, Response, NextFunction } from 'express';
import { createOpenApiRouter } from './schema/openapi';
import {
  MetadataEntryCreate,
  MetadataEntryUpdate,
  MetadataService,
} from './services/MetadataService/types';
import { z } from 'zod';
import { Knex } from 'knex';
import { DatasetRow } from './database';

export async function createRouter({
  httpAuth,
  metadataService,
  database,
}: {
  httpAuth: HttpAuthService;
  metadataService: MetadataService;
  database: Knex;
}): Promise<express.Router> {
  const parentRouter = Router();
  parentRouter.use(express.json());

  // Ensure datasets table exists with all required columns
  if (!(await database.schema.hasTable('datasets'))) {
    await database.schema.createTable('datasets', table => {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.text('summary');
      table.string('versioning').notNullable();
      table.boolean('allow_z_values').notNullable().defaultTo(false);
      table.string('status').notNullable();
      table.timestamp('created_at').defaultTo(database.fn.now());
    });
  } else {
    // Migrate existing table if needed
    const hasVersioning = await database.schema.hasColumn('datasets', 'versioning');
    if (!hasVersioning) {
      await database.schema.alterTable('datasets', table => {
        table.text('summary');
        table.string('versioning').notNullable().defaultTo('Ej versionerad');
        table.boolean('allow_z_values').notNullable().defaultTo(false);
        table.string('status').notNullable().defaultTo('Ska sättas');
      });
      // Remove old title column if it exists
      const hasTitle = await database.schema.hasColumn('datasets', 'title');
      if (hasTitle) {
        await database.schema.alterTable('datasets', table => {
          table.dropColumn('title');
        });
      }
    }
  }

  // Metadata entries list endpoint (for entity providers)
  parentRouter.get('/metadata-entries', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const entries = await metadataService.getMetadataEntriesPublic();
      res.json(entries);
    } catch (error) {
      next(error);
    }
  });

  // Datasets list endpoint (for entity providers)
  parentRouter.get('/datasets', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const datasets = await database<DatasetRow>('datasets').select('*');
      res.json(datasets);
    } catch (error) {
      next(error);
    }
  });

  // Create dataset endpoint
  parentRouter.post('/datasets', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await httpAuth.credentials(req, { allow: ['user', 'service'] });

      const body = z
        .object({
          name: z.string().min(1),
          summary: z.string().optional(),
          versioning: z.string().min(1),
          allowZValues: z.boolean(),
          status: z.string().min(1),
        })
        .parse(req.body);

      // Normalize name to be URL-safe
      const normalizedName = body.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      // Check if dataset already exists
      const existing = await database<DatasetRow>('datasets')
        .where('name', normalizedName)
        .first();

      if (existing) {
        res.status(409).json({ error: 'Dataset already exists', dataset: existing });
        return;
      }

      const [id] = await database<DatasetRow>('datasets').insert({
        name: normalizedName,
        summary: body.summary || null,
        versioning: body.versioning,
        allow_z_values: body.allowZValues,
        status: body.status,
      });

      const dataset = await database<DatasetRow>('datasets').where('id', id).first();
      res.status(201).json(dataset);
    } catch (error) {
      next(error);
    }
  });

  const openApiRouter = await createOpenApiRouter();

  openApiRouter.post('/', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user', 'service'] });

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
    const credentials = await httpAuth.credentials(req, { allow: ['user', 'service'] });
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
