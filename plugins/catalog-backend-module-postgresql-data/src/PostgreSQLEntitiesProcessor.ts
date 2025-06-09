import {
  CatalogProcessor,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  Entity,
  getCompoundEntityRef,
} from '@backstage/catalog-model';
import {
  postgresqlTableEntityValidator,
  postgresqlViewEntityValidator,
} from '@internal/postgresql-data-common';

  interface ViewColumn { 
    source: {
      schema: string;
      table: string;
      namespace?: string;
    }
  }

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

      if (!entity.spec) {
        throw new Error("View entity must have 'spec.view' defined");
      }

      const seen = new Set<string>();
      // @ts-ignore
      const dependencies:ViewColumn[] = entity.spec.columns
      // @ts-ignore
      .filter((column : ViewColumn) => column.source && column.source.schema && column.source.table)
      .filter((column : ViewColumn) => {
        const key = `${column.source.schema}.${column.source.table}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      for (const dependency of dependencies) {
        emit({
          type: 'relation',
          relation: {
            type: 'dependsOn',
            source: getCompoundEntityRef(entity),
            target: {
              kind: 'Table',
              namespace: `${dependency.source.namespace || 'default'}`,
              name: `${dependency.source.schema}.${dependency.source.table}`,
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
              namespace: `${dependency.source.namespace || 'default'}`,
              name: `${dependency.source.schema}.${dependency.source.table}`,
            },
          },
        });
      }
    }

    return entity;
  }
}
