import {
  CatalogProcessor,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  Entity,
  getCompoundEntityRef,
  RELATION_DEPENDENCY_OF,
  RELATION_DEPENDS_ON,
} from '@backstage/catalog-model';
import {
  postgresqlSchemaEntityValidator,
  postgresqlTableEntityValidator,
  postgresqlViewEntityValidator,
} from '@internal/postgresql-data-common';

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
    } else if (entity.kind === 'Schema') {
      return await postgresqlSchemaEntityValidator.check(entity);
    }
    return false;
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ) {
    if (entity.kind === 'View' || entity.kind === 'Table' || entity.kind === 'Schema') {
      if (!entity.spec) {
        throw new Error("View entity must have 'spec' defined");
      }

      // @ts-ignore
      const dependencies: CompoundEntityRef[] = entity.spec.dependencyOf;

      for (const dependency of dependencies) {
        emit({
          type: 'relation',
          relation: {
            type: RELATION_DEPENDENCY_OF,
            source: getCompoundEntityRef(entity),
            target: dependency,
          },
        });
        emit({
          type: 'relation',
          relation: {
            type: RELATION_DEPENDS_ON,
            target: getCompoundEntityRef(entity),
            source: dependency,
          },
        });
      }
    }

    return entity;
  }
}
