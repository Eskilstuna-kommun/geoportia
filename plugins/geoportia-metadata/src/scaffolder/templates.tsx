import React from 'react';
import type { FieldTemplateProps, DescriptionFieldProps } from '@rjsf/utils';
import { Box, Tooltip, Button, Typography } from '@material-ui/core';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import AddIcon from '@material-ui/icons/Add';

export const CustomDescriptionFieldTemplate = (_props: DescriptionFieldProps) => {
  return null;
};

export const CustomFieldTemplate = (props: FieldTemplateProps) => {
  const { children, schema, rawDescription, classNames, hidden, label, required } = props;
  const description = rawDescription || schema.description;

  if (hidden) {
    return <div style={{ display: 'none' }}>{children}</div>;
  }

  // Render label with optional tooltip for description
  return (
    <Box className={classNames} style={{ marginBottom: 16, width: '100%' }}>
      {label && (
        <Box display="flex" alignItems="center" mb={0.5}>
          <Typography
            variant="caption"
            style={{ color: 'rgba(0, 0, 0, 0.54)', fontSize: '0.75rem' }}
          >
            {label}{required ? ' *' : ''}
          </Typography>
          {description && (
            <Tooltip title={description} arrow placement="top">
              <HelpOutlineIcon
                fontSize="small"
                style={{ color: '#888', cursor: 'help', fontSize: 14, marginLeft: 4 }}
              />
            </Tooltip>
          )}
        </Box>
      )}
      <Box style={{ width: '100%' }}>{children}</Box>
    </Box>
  );
};

export const createCustomTemplates = (addButtonText: string) => ({
  FieldTemplate: CustomFieldTemplate,
  DescriptionFieldTemplate: CustomDescriptionFieldTemplate,
  ButtonTemplates: {
    AddButton: (buttonProps: any) => (
      <Button
        {...buttonProps}
        variant="outlined"
        color="primary"
        startIcon={<AddIcon />}
        style={{ marginTop: 16 }}
      >
        {addButtonText}
      </Button>
    ),
  },
});
