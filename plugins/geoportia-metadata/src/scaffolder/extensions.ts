import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import {
  createScaffolderFieldExtension,
  CustomFieldValidator,
} from '@backstage/plugin-scaffolder-react';
import validator from '@rjsf/validator-ajv8';
import type { RJSFSchema } from '@rjsf/utils';
import { GeoPortiaMetadataField } from './GeoPortiaMetadataField';
import type {
  GeoPortiaMetadataFieldValue,
  GeoPortiaMetadataFieldUiOptions,
} from './GeoPortiaMetadataField';

const PLACEHOLDER_VALUES = new Set(['Välj...', '']);

const collectMissingRequired = (
  schema: RJSFSchema,
  data: unknown,
  path: string,
  errors: string[],
): void => {
  if (!schema || typeof schema !== 'object') return;

  if (schema.type === 'object' && schema.properties) {
    const obj = (data as Record<string, unknown> | undefined) ?? {};
    const required: string[] = Array.isArray(schema.required) ? schema.required : [];

    for (const key of required) {
      const propSchema = schema.properties[key] as RJSFSchema | undefined;
      const value = obj[key];
      const label =
        (propSchema && typeof propSchema === 'object' && propSchema.title) || key;
      const fullLabel = path ? `${path} › ${label}` : label;

      const isMissing =
        value === undefined ||
        value === null ||
        (typeof value === 'string' && PLACEHOLDER_VALUES.has(value)) ||
        (Array.isArray(value) && value.length === 0);

      if (isMissing) {
        errors.push(`${fullLabel} är obligatoriskt`);
      }
    }

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (
        propSchema &&
        typeof propSchema === 'object' &&
        (propSchema as RJSFSchema).type === 'object'
      ) {
        const label = (propSchema as RJSFSchema).title || key;
        const fullLabel = path ? `${path} › ${label}` : label;
        collectMissingRequired(
          propSchema as RJSFSchema,
          (obj as Record<string, unknown>)[key],
          fullLabel,
          errors,
        );
      }
    }
  }
};

const validateGeoPortiaMetadata: CustomFieldValidator<
  GeoPortiaMetadataFieldValue,
  GeoPortiaMetadataFieldUiOptions
> = (data, field, context) => {
  const uiOptions = context.uiSchema?.['ui:options'] as
    | GeoPortiaMetadataFieldUiOptions
    | undefined;
  const innerSchema = uiOptions?.geoportiaMetadataSchema;
  if (!innerSchema) return;

  const fullSchema: RJSFSchema =
    innerSchema.type === 'array'
      ? innerSchema
      : ({ type: 'object', ...innerSchema } as RJSFSchema);

  const metadata = data?.metadata ?? (innerSchema.type === 'array' ? [] : {});

  // Standard JSON-Schema validation via the same validator RJSF uses.
  const result = validator.validateFormData(metadata, fullSchema);
  if (result.errors && result.errors.length > 0) {
    for (const err of result.errors) {
      field.addError(err.stack || err.message || 'Ogiltigt värde');
    }
  }

  // Treat placeholder values like "Välj..." as missing for required fields,
  // since ajv only sees them as valid enum strings.
  const missing: string[] = [];
  collectMissingRequired(fullSchema, metadata, '', missing);
  for (const msg of missing) {
    field.addError(msg);
  }
};

export const GeoPortiaMetadataFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    name: 'GeoPortiaMetadataField',
    component: GeoPortiaMetadataField as any,
    validation: validateGeoPortiaMetadata as any,
  }),
);

export type { GeoPortiaMetadataFieldValue, GeoPortiaMetadataFieldUiOptions };
