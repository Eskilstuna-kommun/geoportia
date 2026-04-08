import React, { useState } from 'react';
import Form from '@rjsf/material-ui';
import validator from '@rjsf/validator-ajv8';
import type { RJSFSchema } from '@rjsf/utils';
import {
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@material-ui/core';
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import AddIcon from '@material-ui/icons/Add';
import MoreVertIcon from '@material-ui/icons/MoreVert';
import SecurityIcon from '@material-ui/icons/Security';
import VisibilityIcon from '@material-ui/icons/Visibility';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import { customWidgets } from './widgets';
import type { AttributRow } from './types';

const HEADER_CELL_STYLE = { fontWeight: 600, textTransform: 'uppercase' as const, fontSize: '0.75rem' };
const DEFAULT_SKYDDSKLASS = 'Inget skyddsbehov';

const getSkyddsklassColor = (skyddsklass?: string): string => {
  switch (skyddsklass) {
    case 'Högt skyddsbehov': return '#d32f2f';
    case 'Begränsat skyddsbehov': return '#ff9800';
    default: return '#4caf50';
  }
};

interface TableViewProps {
  headerTitle?: string;
  addButtonText: string;
  rows: AttributRow[];
  itemSchema?: RJSFSchema;
  onRowsChange: (rows: AttributRow[]) => void;
}

export const TableView = ({
  headerTitle,
  addButtonText,
  rows,
  itemSchema,
  onRowsChange,
}: TableViewProps) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<AttributRow | null>(null);
  const [isNewRow, setIsNewRow] = useState(false);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, index: number) => {
    setMenuAnchor(event.currentTarget);
    setSelectedRowIndex(index);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedRowIndex(null);
  };

  const handleView = () => {
    if (selectedRowIndex !== null) {
      setEditingRow(rows[selectedRowIndex]);
      setIsNewRow(false);
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (selectedRowIndex !== null) {
      setEditingRow({ ...rows[selectedRowIndex] });
      setIsNewRow(false);
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedRowIndex !== null) {
      const newRows = [...rows];
      newRows.splice(selectedRowIndex, 1);
      onRowsChange(newRows);
    }
    handleMenuClose();
  };

  const handleAddNew = () => {
    setEditingRow({ namn: '', alias: '', beskrivning: '', skyddsklass: DEFAULT_SKYDDSKLASS, doman: '' });
    setIsNewRow(true);
    setEditDialogOpen(true);
  };

  const handleDialogSave = () => {
    const newRows = [...rows];
    if (isNewRow) {
      newRows.push(editingRow!);
    } else if (selectedRowIndex !== null) {
      newRows[selectedRowIndex] = editingRow!;
    }
    onRowsChange(newRows);
    setEditDialogOpen(false);
    setEditingRow(null);
    setSelectedRowIndex(null);
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
    setEditingRow(null);
  };

  return (
    <Box>
      {headerTitle && (
        <Box display="flex" alignItems="center" mb={2}>
          <Typography variant="h6" style={{ fontWeight: 500 }}>
            {headerTitle}
          </Typography>
          <HelpOutlineIcon fontSize="small" style={{ marginLeft: 8, color: '#888' }} />
        </Box>
      )}

      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
          style={{ backgroundColor: '#4a4a4a', color: 'white' }}
        >
          {addButtonText}
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow style={{ backgroundColor: '#f5f5f5' }}>
              <TableCell style={HEADER_CELL_STYLE}>Namn</TableCell>
              <TableCell style={HEADER_CELL_STYLE}>Alias</TableCell>
              <TableCell style={HEADER_CELL_STYLE}>Beskrivning</TableCell>
              <TableCell style={HEADER_CELL_STYLE}>Skyddsklass</TableCell>
              <TableCell style={HEADER_CELL_STYLE}>Domän</TableCell>
              <TableCell style={{ width: 50 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow key={index} hover>
                <TableCell>{row.namn}</TableCell>
                <TableCell>{row.alias}</TableCell>
                <TableCell>{row.beskrivning}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    <SecurityIcon
                      fontSize="small"
                      style={{ color: getSkyddsklassColor(row.skyddsklass), marginRight: 4 }}
                    />
                  </Box>
                </TableCell>
                <TableCell>{row.doman}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={(e) => handleMenuOpen(e, index)}>
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" style={{ color: '#888', padding: 32 }}>
                  Inga attribut ännu. Klicka på "{addButtonText}" för att lägga till.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleMenuClose}>
        <MenuItem onClick={handleView}>
          <VisibilityIcon fontSize="small" style={{ marginRight: 8 }} />
          Visa
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" style={{ marginRight: 8 }} />
          Redigera
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <DeleteIcon fontSize="small" style={{ marginRight: 8 }} />
          Radera
        </MenuItem>
      </Menu>

      <Dialog open={editDialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isNewRow ? 'Skapa nytt attribut' : 'Redigera attribut'}</DialogTitle>
        <DialogContent>
          {itemSchema && editingRow && (
            <Form
              schema={itemSchema}
              validator={validator}
              formData={editingRow}
              onChange={(data) => setEditingRow(data.formData as AttributRow)}
              idPrefix="edit-attribut"
              widgets={customWidgets}
              liveValidate
              showErrorList={false}
            >
              <></>
            </Form>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="default">
            Avbryt
          </Button>
          <Button onClick={handleDialogSave} color="primary" variant="contained">
            Spara
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
