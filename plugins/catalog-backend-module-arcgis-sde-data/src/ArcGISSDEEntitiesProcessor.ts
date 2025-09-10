import {
  CatalogProcessor,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import {
  Entity,
  getCompoundEntityRef,
  RELATION_DEPENDENCY_OF,
  RELATION_DEPENDS_ON,
} from '@backstage/catalog-model';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  arcGISSDEDomainEntityValidator,
  arcGISSDEDomainValueEntityValidator,
  arcGISSDEFeatureClassEntityValidator,
  arcGISSDEFeatureClassFieldEntityValidator
} from '@internal/backstage-plugin-arcgis-sde-data-common';

export class ArcGISSDEEntitiesProcessor implements CatalogProcessor {
  getProcessorName(): string {
    return 'ArcGISSDEEntitiesProcessor';
  }

  async validateEntityKind(entity: Entity) {
    return (
      arcGISSDEDomainEntityValidator.check(entity) ||
      arcGISSDEDomainValueEntityValidator.check(entity) ||
      arcGISSDEFeatureClassEntityValidator.check(entity) ||
      arcGISSDEFeatureClassFieldEntityValidator.check(entity)
    );
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ) {
    if (entity.spec?.dialect === 'arcgis') {
      if (!entity.spec || !entity.spec.dependencyOf) {
        throw new Error(
          "ArcGIS entities must have 'spec.dependencyOf' defined",
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
