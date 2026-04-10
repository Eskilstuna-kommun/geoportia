import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type {
  ArrayFieldTemplateProps,
  ArrayFieldTemplateItemType,
} from '@rjsf/utils';
import type { IChangeEvent } from '@rjsf/core';
import Form from '@rjsf/material-ui';
import validator from '@rjsf/validator-ajv8';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SecurityIcon from '@mui/icons-material/Security';

import { customWidgets } from './widgets';
import { createCustomTemplates } from './templates';

interface ColumnDefinition {
  key: string;
  title: string;
}

interface FormContextType {
  addArrayItem?: (item: unknown) => void;
  updateArrayItem?: (index: number, item: unknown) => void;
  deleteArrayItem?: (index: number) => void;
}

interface UiOptions {
  addButtonText?: string;
  emptyMessage?: string;
  tableColumns?: string[];
}

type DialogMode = 'add' | 'edit' | 'view';

const HEADER_CELL_STYLE: React.CSSProperties = {
  fontWeight: 600,
  textTransform: 'uppercase',
  fontSize: '0.75rem',
};

const ICON_STYLE: React.CSSProperties = {
  marginRight: 4,
  verticalAlign: 'middle',
};

const ADD_BUTTON_STYLE: React.CSSProperties = {
  backgroundColor: '#4a4a4a',
  color: 'white',
};

const SKYDDSKLASS_COLORS = {
  high: '#4caf50',
  limited: '#ff9800',
  none: '#f44336',
  default: '#757575',
} as const;

const DEFAULT_TEXTS = {
  addButton: 'Lägg till',
  emptyMessage: 'Inga objekt ännu. Klicka på knappen ovan för att lägga till.',
  dialogTitleEdit: 'Redigera',
  dialogTitleView: 'Visa attribut',
  buttonCancel: 'Avbryt',
  buttonClose: 'Stäng',
  buttonSave: 'Spara',
  menuView: 'Visa',
  menuEdit: 'Redigera',
  menuDelete: 'Radera',
} as const;

const dialogTemplates = createCustomTemplates(DEFAULT_TEXTS.addButton);

const getColumnsFromSchema = (schema: any): ColumnDefinition[] => {
  const itemSchema = schema?.items;
  if (!itemSchema?.properties) return [];

  return Object.entries(itemSchema.properties).map(
    ([key, prop]: [string, any]) => ({
      key,
      title: prop.title || key,
    }),
  );
};

const formatCellValue = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nej';
  return String(value);
};

const getSkyddsklassColor = (value: string): string => {
  const lowerValue = value.toLowerCase();

  if (lowerValue.includes('högt skyddsbehov') || lowerValue === '1') {
    return SKYDDSKLASS_COLORS.high;
  }
  if (lowerValue.includes('begränsat skyddsbehov') || lowerValue === '2') {
    return SKYDDSKLASS_COLORS.limited;
  }
  if (lowerValue.includes('inget skyddsbehov') || lowerValue === '3') {
    return SKYDDSKLASS_COLORS.none;
  }
  return SKYDDSKLASS_COLORS.default;
};

const createDefaultItem = (itemSchema: any): Record<string, any> => {
  const defaultItem: Record<string, any> = {};
  const schemaProps = itemSchema?.properties;

  if (!schemaProps || typeof schemaProps !== 'object') {
    return defaultItem;
  }

  Object.entries(schemaProps).forEach(([key, prop]: [string, any]) => {
    if (prop.default !== undefined) {
      defaultItem[key] = prop.default;
    } else if (prop.type === 'string') {
      defaultItem[key] = '';
    } else if (prop.type === 'boolean') {
      defaultItem[key] = false;
    } else if (prop.type === 'number' || prop.type === 'integer') {
      defaultItem[key] = 0;
    }
  });

  return defaultItem;
};

const validateRequiredFields = (
  item: Record<string, any> | null,
  requiredFields: string[] | undefined,
): boolean => {
  if (!item) return false;
  if (item.tillatTommaVarden === true) return true;
  if (!requiredFields || requiredFields.length === 0) return true;

  return requiredFields.every((field) => {
    const value = item[field];
    return value !== undefined && value !== null && value !== '';
  });
};

const SkyddsklassIcon: React.FC<{ value: string | undefined }> = ({ value }) => {
  if (!value) return null;
  return (
    <SecurityIcon
      fontSize="small"
      style={{ ...ICON_STYLE, color: getSkyddsklassColor(value) }}
    />
  );
};

const DataCell: React.FC<{
  columnKey: string;
  itemData: Record<string, any>;
}> = ({ columnKey, itemData }) => {
  const value = itemData[columnKey];
  const isSkyddsklass = columnKey.toLowerCase() === 'skyddsklass';

  return (
    <TableCell>
      {isSkyddsklass && <SkyddsklassIcon value={value} />}
      {formatCellValue(value)}
    </TableCell>
  );
};

const RowContextMenu: React.FC<{
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ anchorEl, onClose, onView, onEdit, onDelete }) => (
  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
    <MenuItem onClick={onView}>
      <InsertDriveFileIcon fontSize="small" style={{ marginRight: 8 }} />
      {DEFAULT_TEXTS.menuView}
    </MenuItem>
    <MenuItem onClick={onEdit}>
      <EditIcon fontSize="small" style={{ marginRight: 8 }} />
      {DEFAULT_TEXTS.menuEdit}
    </MenuItem>
    <MenuItem onClick={onDelete}>
      <DeleteIcon fontSize="small" style={{ marginRight: 8 }} />
      {DEFAULT_TEXTS.menuDelete}
    </MenuItem>
  </Menu>
);

const ItemDialog: React.FC<{
  open: boolean;
  mode: DialogMode;
  title: string;
  itemSchema: object;
  formData: any;
  isSaveDisabled: boolean;
  onChange: (data: IChangeEvent) => void;
  onClose: () => void;
  onSave: () => void;
}> = ({
  open,
  mode,
  title,
  itemSchema,
  formData,
  isSaveDisabled,
  onChange,
  onClose,
  onSave,
}) => {
  const isViewMode = mode === 'view';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {formData !== null && (
          <Form
            schema={{ type: 'object', ...itemSchema }}
            validator={validator}
            formData={formData}
            onChange={onChange}
            idPrefix="table-item-edit"
            widgets={customWidgets}
            templates={dialogTemplates}
            disabled={isViewMode}
            liveValidate={!isViewMode}
            showErrorList={false}
          >
            <></>
          </Form>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="default">
          {isViewMode ? DEFAULT_TEXTS.buttonClose : DEFAULT_TEXTS.buttonCancel}
        </Button>
        {!isViewMode && (
          <Button
            onClick={onSave}
            color="primary"
            variant="contained"
            disabled={isSaveDisabled}
          >
            {DEFAULT_TEXTS.buttonSave}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export const TableArrayFieldTemplate: React.FC<ArrayFieldTemplateProps> = (props) => {
  const { items, canAdd, onAddClick, schema, uiSchema, formContext } = props;

  // Form Context Callbacks
  const { addArrayItem, updateArrayItem, deleteArrayItem } =
    (formContext as FormContextType) || {};

  // State
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>('add');
  const [editingItem, setEditingItem] = useState<Record<string, any> | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Refs
  const pendingNewItem = useRef<any>(null);
  const prevItemsLength = useRef(items.length);

  // Derived Values
  const columns = useMemo(() => getColumnsFromSchema(schema), [schema]);

  const itemSchema = useMemo(() => {
    const rawItemSchema = schema?.items;
    return rawItemSchema &&
      typeof rawItemSchema === 'object' &&
      !Array.isArray(rawItemSchema)
      ? rawItemSchema
      : {};
  }, [schema]);

  const uiOptions = uiSchema?.['ui:options'] as UiOptions | undefined;
  const addButtonText = uiOptions?.addButtonText || DEFAULT_TEXTS.addButton;
  const emptyMessage = uiOptions?.emptyMessage || DEFAULT_TEXTS.emptyMessage;

  const displayColumns = useMemo(() => {
    const tableColumnKeys = uiOptions?.tableColumns;
    return tableColumnKeys
      ? columns.filter((col) => tableColumnKeys.includes(col.key))
      : columns;
  }, [columns, uiOptions?.tableColumns]);

  const requiredFields = (itemSchema as any)?.required as string[] | undefined;

  // Effects
  useEffect(() => {
    if (pendingNewItem.current !== null && items.length > prevItemsLength.current) {
      const lastItem = items[items.length - 1];
      lastItem?.children?.props?.onChange?.(pendingNewItem.current);
      pendingNewItem.current = null;
    }
    prevItemsLength.current = items.length;
  }, [items]);

  // Handlers
  const handleMenuOpen = useCallback(
    (event: React.MouseEvent<HTMLElement>, index: number) => {
      setMenuAnchor(event.currentTarget);
      setSelectedIndex(index);
    },
    [],
  );

  const handleMenuClose = useCallback(() => {
    setMenuAnchor(null);
    setSelectedIndex(null);
  }, []);

  const openDialog = useCallback(
    (mode: DialogMode, item: Record<string, any> | null, index: number | null) => {
      setEditingItem(item);
      setEditingIndex(index);
      setDialogMode(mode);
      setDialogOpen(true);
    },
    [],
  );

  const handleView = useCallback(() => {
    if (selectedIndex !== null && items[selectedIndex]) {
      openDialog('view', items[selectedIndex].children.props.formData, selectedIndex);
    }
    handleMenuClose();
  }, [selectedIndex, items, openDialog, handleMenuClose]);

  const handleEdit = useCallback(() => {
    if (selectedIndex !== null && items[selectedIndex]) {
      openDialog('edit', { ...items[selectedIndex].children.props.formData }, selectedIndex);
    }
    handleMenuClose();
  }, [selectedIndex, items, openDialog, handleMenuClose]);

  const handleDelete = useCallback(() => {
    if (selectedIndex !== null) {
      if (deleteArrayItem) {
        deleteArrayItem(selectedIndex);
      } else if (items[selectedIndex]) {
        items[selectedIndex].onDropIndexClick(selectedIndex)();
      }
    }
    handleMenuClose();
  }, [selectedIndex, items, deleteArrayItem, handleMenuClose]);

  const handleAddNew = useCallback(() => {
    const defaultItem = createDefaultItem(itemSchema);
    openDialog('add', defaultItem, null);
  }, [itemSchema, openDialog]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setEditingItem(null);
    setEditingIndex(null);
  }, []);

  const handleDialogChange = useCallback((data: IChangeEvent) => {
    setEditingItem(data.formData);
  }, []);

  const handleDialogSave = useCallback(() => {
    if (dialogMode === 'add') {
      if (addArrayItem) {
        addArrayItem(editingItem);
      } else if (canAdd && onAddClick) {
        pendingNewItem.current = editingItem;
        onAddClick({ preventDefault: () => {} } as any);
      }
    } else if (dialogMode === 'edit' && editingIndex !== null) {
      if (updateArrayItem) {
        updateArrayItem(editingIndex, editingItem);
      } else if (items[editingIndex]) {
        items[editingIndex].children.props.onChange?.(editingItem);
      }
    }
    handleDialogClose();
  }, [
    dialogMode,
    editingItem,
    editingIndex,
    addArrayItem,
    updateArrayItem,
    canAdd,
    onAddClick,
    items,
    handleDialogClose,
  ]);

  // Computed
  const isSaveDisabled = !validateRequiredFields(editingItem, requiredFields);

  const dialogTitle = useMemo(() => {
    switch (dialogMode) {
      case 'add':
        return addButtonText;
      case 'view':
        return DEFAULT_TEXTS.dialogTitleView;
      default:
        return DEFAULT_TEXTS.dialogTitleEdit;
    }
  }, [dialogMode, addButtonText]);

  // Render
  return (
    <Box>
      {/* Add Button */}
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          disabled={!canAdd}
          style={ADD_BUTTON_STYLE}
        >
          {addButtonText}
        </Button>
      </Box>

      {/* Data Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow style={{ backgroundColor: '#f5f5f5' }}>
              {displayColumns.map((col) => (
                <TableCell key={col.key} style={HEADER_CELL_STYLE}>
                  {col.title}
                </TableCell>
              ))}
              <TableCell style={{ width: 50 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item: ArrayFieldTemplateItemType, index: number) => {
              const itemData = item.children.props.formData || {};
              return (
                <TableRow key={item.key} hover>
                  {displayColumns.map((col) => (
                    <DataCell key={col.key} columnKey={col.key} itemData={itemData} />
                  ))}
                  <TableCell>
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, index)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={displayColumns.length + 1}
                  align="center"
                  style={{ color: '#888', padding: 32 }}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Context Menu */}
      <RowContextMenu
        anchorEl={menuAnchor}
        onClose={handleMenuClose}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Item Dialog */}
      <ItemDialog
        open={dialogOpen}
        mode={dialogMode}
        title={dialogTitle}
        itemSchema={itemSchema as object}
        formData={editingItem}
        isSaveDisabled={isSaveDisabled}
        onChange={handleDialogChange}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
      />
    </Box>
  );
};
