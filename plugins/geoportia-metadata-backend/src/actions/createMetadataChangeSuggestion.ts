import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { stringifyEntityRef, parseEntityRef } from '@backstage/catalog-model';
import { InputError } from '@backstage/errors';
import { JsonObject } from '@backstage/types';
import { SuggestionService } from '../services/SuggestionService/types';

export interface CreateMetadataChangeSuggestionActionOptions {
  suggestionService: Pick<SuggestionService, 'createSuggestion'>;
}

export function createMetadataChangeSuggestionAction(
  options: CreateMetadataChangeSuggestionActionOptions,
) {
  const { suggestionService } = options;

  return createTemplateAction({
    id: 'geoportia:metadata:suggestion:create',
    description:
      'Creates a metadata change suggestion for an existing metadata entry',
    schema: {
      input: {
        type: 'object',
        required: ['entityRef', 'metadata'],
        properties: {
          entityRef: {
            type: 'string',
            title: 'Entity Reference',
            description:
              'The entityRef of the existing metadata entry to suggest changes for',
          },
          metadata: {
            type: 'object',
            title: 'Suggested Metadata',
            description: 'The suggested metadata values',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          suggestionId: {
            type: 'number',
            title: 'Suggestion ID',
            description: 'The ID of the created suggestion',
          },
        },
      },
    },
    async handler(ctx) {
      const entityRef = ctx.input.entityRef as string;
      const metadata = ctx.input.metadata as JsonObject;

      // Validate and normalize entityRef
      let parsedRef;
      try {
        parsedRef = parseEntityRef(entityRef);
      } catch (e) {
        throw new InputError(`Invalid entityRef format: ${entityRef}`);
      }
      const normalizedRef = stringifyEntityRef(parsedRef);

      if (!metadata || typeof metadata !== 'object') {
        throw new InputError('metadata must be a valid JSON object');
      }

      const suggestedBy = ctx.user?.entity
        ? stringifyEntityRef(ctx.user.entity)
        : ctx.user?.ref ?? 'user:default/unknown';

      ctx.logger.info(
        `Creating metadata suggestion for ${normalizedRef} by ${suggestedBy}`,
      );

      const result = await suggestionService.createSuggestion(
        normalizedRef,
        metadata,
        suggestedBy,
      );

      ctx.logger.info(`Created suggestion ${result.id} for ${normalizedRef}`);

      ctx.output('suggestionId', result.id);
    },
  });
}
