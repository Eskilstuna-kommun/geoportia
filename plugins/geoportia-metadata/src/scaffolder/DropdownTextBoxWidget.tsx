import * as React from 'react';
import type { WidgetProps } from '@rjsf/utils';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@material-ui/core';

type DropdownTextBoxChoice = {
  id: string;
  name: string;
  description: string;
};

type DropdownTextBoxUiOptions = {
  choices?: DropdownTextBoxChoice[];
  valueFieldName?: string;
  textFieldName?: string;
  selectLabel?: string;
  textLabel?: string;
  rows?: number;
};

type DropdownTextBoxFormContext = {
  parentFormData?: Record<string, unknown>;
  updateMetadataFields?: (updates: Record<string, unknown>) => void;
};

export const DropdownTextBoxWidget = (props: WidgetProps) => {
  const {
    id,
    value,
    onChange,
    disabled,
    readonly,
    required,
    uiSchema,
    formContext,
  } = props;
  const uiOptions = uiSchema?.['ui:options'] as
    | DropdownTextBoxUiOptions
    | undefined;
  const choices = uiOptions?.choices ?? [];
  const pairedFields =
    uiOptions?.valueFieldName && uiOptions.textFieldName
      ? {
          valueFieldName: uiOptions.valueFieldName,
          textFieldName: uiOptions.textFieldName,
        }
      : undefined;
  const widgetFormContext = formContext as
    | DropdownTextBoxFormContext
    | undefined;
  const updateMetadataFields = widgetFormContext?.updateMetadataFields;
  const pairedValue = Boolean(pairedFields && updateMetadataFields);
  const [selectedId, setSelectedId] = React.useState(
    choices.find(choice => choice.description === value)?.id ?? '',
  );
  const matchingChoiceId = choices.find(
    choice => choice.description === value,
  )?.id;
  const textValue =
    pairedValue && pairedFields
      ? widgetFormContext?.parentFormData?.[pairedFields.textFieldName] ?? ''
      : value ?? '';
  let selectValue = matchingChoiceId ?? selectedId;
  if (pairedValue) {
    selectValue = typeof value === 'string' ? value : '';
  }

  const handleSelection = (
    event: React.ChangeEvent<{ value: unknown }>,
  ) => {
    const choiceId = event.target.value as string;
    const choice = choices.find(option => option.id === choiceId);

    if (pairedValue && pairedFields && updateMetadataFields) {
      updateMetadataFields({
        [pairedFields.valueFieldName]: choiceId,
        [pairedFields.textFieldName]: choice?.description ?? '',
      });
      return;
    }

    setSelectedId(choiceId);
    onChange(choice?.description ?? '');
  };

  const handleTextChange = (text: string) => {
    if (pairedValue && pairedFields && updateMetadataFields) {
      updateMetadataFields({ [pairedFields.textFieldName]: text });
      return;
    }

    onChange(text);
  };

  return (
    <>
      <FormControl
        fullWidth
        variant="outlined"
        margin="dense"
        disabled={disabled || readonly}
      >
        <InputLabel id={`${id}-select-label`}>
          {uiOptions?.selectLabel ?? 'Select an option'}
        </InputLabel>
        <Select
          id={`${id}-select`}
          labelId={`${id}-select-label`}
          value={selectValue}
          onChange={handleSelection}
          label={uiOptions?.selectLabel ?? 'Select an option'}
        >
          {choices.map(choice => (
            <MenuItem key={choice.id} value={choice.id}>
              {choice.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        id={id}
        fullWidth
        multiline
        minRows={uiOptions?.rows ?? 3}
        variant="outlined"
        label={uiOptions?.textLabel ?? 'Description'}
        required={required}
        disabled={disabled || readonly}
        value={textValue}
        onChange={event => handleTextChange(event.target.value)}
        margin="dense"
      />
    </>
  );
};
