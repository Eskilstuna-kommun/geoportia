import React, { useCallback, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Collapse,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AttachFileIcon from '@material-ui/icons/AttachFile';
import DeleteIcon from '@material-ui/icons/Delete';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import ExpandLessIcon from '@material-ui/icons/ExpandLess';
import CloudUploadIcon from '@material-ui/icons/CloudUpload';

const useStyles = makeStyles((theme) => ({
  sidebar: {
    position: 'sticky',
    top: theme.spacing(2),
  },
  section: {
    marginBottom: theme.spacing(2),
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1.5, 2),
    backgroundColor: theme.palette.grey[100],
    borderRadius: theme.shape.borderRadius,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.grey[200],
    },
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    fontWeight: 500,
  },
  sectionContent: {
    padding: theme.spacing(2),
  },
  dropZone: {
    border: `2px dashed ${theme.palette.grey[300]}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(3),
    textAlign: 'center',
    backgroundColor: theme.palette.grey[50],
    cursor: 'pointer',
    transition: 'all 0.2s',
    '&:hover': {
      borderColor: theme.palette.primary.main,
      backgroundColor: `${theme.palette.primary.light}10`,
    },
  },
  dropZoneActive: {
    borderColor: theme.palette.primary.main,
    backgroundColor: `${theme.palette.primary.light}20`,
  },
  fileList: {
    marginTop: theme.spacing(1),
  },
  fileItem: {
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(0.5),
  },
  uploadButton: {
    marginTop: theme.spacing(1),
  },
  infoText: {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    marginTop: theme.spacing(2),
  },
  uuidText: {
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    wordBreak: 'break-all',
  },
}));

export interface AttachedFile {
  name: string;
  size?: number;
  type?: string;
  data?: string; // base64 encoded
}

export interface MetadataInfoPanelProps {
  uuid?: string;
  createdAt?: string;
  createdBy?: string;
  attachedFiles: AttachedFile[];
  adminComment: string;
  onFilesChange: (files: AttachedFile[]) => void;
  onCommentChange: (comment: string) => void;
}

export const MetadataInfoPanel: React.FC<MetadataInfoPanelProps> = ({
  uuid,
  createdAt,
  createdBy,
  attachedFiles,
  adminComment,
  onFilesChange,
  onCommentChange,
}) => {
  const classes = useStyles();
  const [filesExpanded, setFilesExpanded] = useState(true);
  const [commentExpanded, setCommentExpanded] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback((fileList: FileList) => {
    const newFiles: AttachedFile[] = [];
    
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        newFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          data: reader.result as string,
        });
        
        if (newFiles.length === fileList.length) {
          onFilesChange([...attachedFiles, ...newFiles]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [attachedFiles, onFilesChange]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleRemoveFile = useCallback((index: number) => {
    const newFiles = attachedFiles.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  }, [attachedFiles, onFilesChange]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Box className={classes.sidebar}>
      {uuid && (
        <Box mb={2}>
          <Typography variant="caption" color="textSecondary">
            UUID:
          </Typography>
          <Typography className={classes.uuidText}>
            {uuid}
          </Typography>
        </Box>
      )}

      {/* Bifogade filer section */}
      <Paper className={classes.section} variant="outlined">
        <Box
          className={classes.sectionHeader}
          onClick={() => setFilesExpanded(!filesExpanded)}
        >
          <Box className={classes.sectionTitle}>
            <AttachFileIcon fontSize="small" />
            <Typography variant="subtitle2">Bifogade filer</Typography>
          </Box>
          {filesExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        <Collapse in={filesExpanded}>
          <Box className={classes.sectionContent}>
            <Box
              className={`${classes.dropZone} ${dragActive ? classes.dropZoneActive : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <CloudUploadIcon color="action" style={{ fontSize: 32 }} />
              <Typography variant="body2" color="textSecondary">
                Släpp filer för att ladda upp eller
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="small"
                className={classes.uploadButton}
              >
                Välj filer
              </Button>
              <input
                id="file-input"
                type="file"
                multiple
                hidden
                onChange={handleFileInput}
              />
            </Box>

            {attachedFiles.length > 0 && (
              <List dense className={classes.fileList}>
                {attachedFiles.map((file, index) => (
                  <ListItem key={index} className={classes.fileItem}>
                    <ListItemText
                      primary={`• ${file.name}`}
                      secondary={formatFileSize(file.size)}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemoveFile(index)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Collapse>
      </Paper>

      {/* Kommentar från admin section */}
      <Paper className={classes.section} variant="outlined">
        <Box
          className={classes.sectionHeader}
          onClick={() => setCommentExpanded(!commentExpanded)}
        >
          <Box className={classes.sectionTitle}>
            <Typography variant="subtitle2">Kommentar från admin</Typography>
          </Box>
          {commentExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </Box>
        <Collapse in={commentExpanded}>
          <Box className={classes.sectionContent}>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              placeholder="Lorem ipsum dolar"
              value={adminComment}
              onChange={(e) => onCommentChange(e.target.value)}
            />
          </Box>
        </Collapse>
      </Paper>

      {/* Footer info */}
      {(createdAt || createdBy) && (
        <Typography className={classes.infoText}>
          Skapad {createdAt || '[dagens datum yyyy-mm-dd]'} av {createdBy || '[inloggad användare]'}
        </Typography>
      )}
    </Box>
  );
};
