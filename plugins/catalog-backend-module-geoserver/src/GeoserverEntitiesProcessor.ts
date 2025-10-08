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
import { LoggerService } from '@backstage/backend-plugin-api';
import {
  geoserverLayerEntityValidator,
  geoserverStoreEntityValidator,
} from '@internal/geoserver-data-common';

export class GeoserverEntitiesProcessor implements CatalogProcessor {
  constructor(private logger: LoggerService) {}

  getProcessorName() {
    return 'GeoserverEntitiesProcessor';
  }

  async validateEntityKind(entity: any): Promise<boolean> {
    return (
      geoserverLayerEntityValidator.check(entity) ||
      geoserverStoreEntityValidator.check(entity)
    );
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ) {
    if (entity.spec?.dialect === 'geoserver') {
      if (!entity.spec || !entity.spec.dependencyOf) {
        throw new Error(
          "Geoserver entities must have 'spec.dependencyOf' defined",
        );
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
