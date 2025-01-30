import {
  CatalogProcessor,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  ANNOTATION_LOCATION,
  Entity,
  getCompoundEntityRef,
} from '@backstage/catalog-model';
import {
  postgresqlTableEntityValidator,
  postgresqlViewEntityValidator,
} from '@internal/postgresql-data-common';
import Knex from 'knex';

export class PostgreSQLEntitiesProcessor implements CatalogProcessor {
  getProcessorName() {
    return 'PostgreSQLEntitiesProcessor';
  }

  async validateEntityKind(entity: Entity) {
    if (entity.apiVersion !== 'geoportia.se/v1alpha1') {
      return false;
    }
    if (entity.kind === 'Table') {
      return await postgresqlTableEntityValidator.check(entity);
    } else if (entity.kind === 'View') {
      return await postgresqlViewEntityValidator.check(entity);
    }
    return false;
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ) {
    if (entity.kind === 'View') {
      const db = Knex({
        client: 'pg',
        connection: entity.metadata.annotations?.[ANNOTATION_LOCATION],
      });

      const dependencies = await db.raw(`SELECT cl_d.relname AS ref_table
                                         FROM pg_rewrite AS r
                                                  JOIN pg_class AS cl_r ON r.ev_class = cl_r.oid
                                                  JOIN pg_depend AS d ON r.oid = d.objid
                                                  JOIN pg_class AS cl_d ON d.refobjid = cl_d.oid
                                         WHERE cl_d.relkind IN ('r', 'v')
                                           AND cl_r.relname = 'hospitals'
                                         GROUP BY cl_d.relname
                                         ORDER BY cl_d.relname;`);

      for (const dependency of dependencies.rows) {
        if (
          dependency.ref_table === entity.metadata.name.replace('public.', '')
        ) {
          continue;
        }
        emit({
          type: 'relation',
          relation: {
            type: 'dependsOn',
            source: getCompoundEntityRef(entity),
            target: {
              kind: 'Table',
              namespace: 'default',
              name: `public.${dependency.ref_table}`,
            },
          },
        });
        emit({
          type: 'relation',
          relation: {
            type: 'dependencyOf',
            target: getCompoundEntityRef(entity),
            source: {
              kind: 'Table',
              namespace: 'default',
              name: `public.${dependency.ref_table}`,
            },
          },
        });
      }
    }

    return entity;
  }
}
