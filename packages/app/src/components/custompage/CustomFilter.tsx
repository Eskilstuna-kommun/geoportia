import {
  DefaultEntityFilters,
  EntityFilter,
} from '@backstage/plugin-catalog-react';
import { Entity } from '@backstage/catalog-model';

export class EntityBooleanFilter implements EntityFilter {
  readonly columnOptions: string[];
  readonly filteredColumns: Record<string, string>;
  constructor(
    columnOptions: string[],
    filteredColumns: Record<string, string>,
  ) {
    this.columnOptions = columnOptions;
    this.filteredColumns = filteredColumns;
  }

  filterEntity(entity: Entity): boolean {
    for (const columnOption of this.columnOptions) {
      const columnState = this.filteredColumns[columnOption];

      if (columnState !== undefined) {
        if (columnState === 'none') {
          continue;
        }

        if (entity.metadata[columnOption] !== columnState) {
          return false;
        }
      }
    }

    return true;
  }

  // @ts-ignore
  getCatalogFilters() {
    let filter: Record<string, string>[] = [];
    for (const columnOption of this.columnOptions) {
      if (this.filteredColumns[columnOption] !== 'none') {
        filter = [
          ...filter,
          {
            [`medadata.${columnOption}`]:
              this.filteredColumns[columnOption],
          },
        ];
      }
    }

    return filter;
  }

  toQueryValue() {
    return this.filteredColumns.description;
  }
}

export type CustomFilters = DefaultEntityFilters & {
  booleanFilters?: EntityBooleanFilter;
};
