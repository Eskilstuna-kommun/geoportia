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
    return (
      postgresqlSchemaEntityValidator.check(entity) ||
      postgresqlTableEntityValidator.check(entity) ||
      postgresqlViewEntityValidator.check(entity)
    );
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ) {
    if (entity.spec?.dialect === 'postgresql') {
      if (!entity.spec) {
        throw new Error("PostgreSQL entity must have 'spec' defined");
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
