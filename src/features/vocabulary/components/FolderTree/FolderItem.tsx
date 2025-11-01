import React, { memo, useCallback } from 'react';
import { Box, Collapse, IconButton, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import type { FolderNode, FileLeaf } from '../../types';

// ===== File Item Component =====
export const FileItem = memo(function FileItem({
  node,
  onClick,
  level = 0,
  onContext,
}: {
  node: FileLeaf;
  onClick: () => void;
  level?: number;
  onContext: (e: React.MouseEvent) => void;
}) {
  return (
    <ListItemButton
      sx={{
        pl: 4 + level * 2,
        position: 'relative',
        '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
        '&::before':
          level > 0
            ? {
                content: '""',
                position: 'absolute',
                left: 20 + (level - 1) * 20,
                top: 0,
                bottom: 0,
                width: '1px',
                backgroundColor: '#e0e0e0',
              }
            : undefined,
      }}
      onClick={onClick}
      onContextMenu={onContext}
      aria-label={`File ${node.name}`}
    >
      <FileIcon sx={{ fontSize: '1rem', mr: 1, color: 'text.secondary' }} />
      <ListItemText primary={<Typography variant="body2">{node.name.replace(/\.txt$/i, '')}</Typography>} />
    </ListItemButton>
  );
});

// ===== Folder Item Component (Recursive) =====
export const FolderItem = memo(function FolderItem({
  node,
  level = 0,
  onFileClick,
  onContext,
  path,
  forceShowMenu = false,
  isFolderOpen,
  onToggle,
}: {
  node: FolderNode;
  level?: number;
  onFileClick: (filePath: string[], fileName: string) => void;
  onContext: (type: 'folder' | 'file', path: string[], event: React.MouseEvent) => void;
  path: string[]; // ids from root to this node
  forceShowMenu?: boolean;
  isFolderOpen?: (id: string) => boolean;
  onToggle?: (folderId: string, open: boolean) => void;
}) {
  const open = isFolderOpen ? isFolderOpen(node.id) : false;
  const handleToggle = useCallback(() => {
    if (onToggle) {
      onToggle(node.id, !open);
    }
  }, [onToggle, node.id, open]);

  return (
    <>
      <Box sx={{ position: 'relative', '&:hover .folder-menu-icon': { opacity: 1 } }}>
        <ListItemButton
          onClick={handleToggle}
          onContextMenu={(e) => onContext('folder', path, e)}
          sx={{
            pl: 2 + level * 2,
            position: 'relative',
            '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
            '&::before':
              level > 0
                ? {
                    content: '""',
                    position: 'absolute',
                    left: 20 + (level - 1) * 20,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    backgroundColor: '#e0e0e0',
                  }
                : undefined,
          }}
          aria-expanded={open}
          aria-label={`Toggle folder ${node.label}`}
        >
          {open ? <FolderOpenIcon color="primary" sx={{ mr: 1 }} /> : <FolderIcon color="primary" sx={{ mr: 1 }} />}
          <ListItemText primary={<Typography variant="body1" sx={{ fontWeight: 500 }}>{node.label}</Typography>} />
          <IconButton
            className="folder-menu-icon"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onContext('folder', path, e as unknown as React.MouseEvent);
            }}
            sx={{ opacity: forceShowMenu ? 1 : 0, transition: 'opacity 0.2s' }}
            aria-label={`Folder menu for ${node.label}`}
          >
            <MoreIcon fontSize="small" />
          </IconButton>
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </ListItemButton>
      </Box>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <List
          component="div"
          disablePadding
          sx={{
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 20 + level * 20,
              top: 0,
              bottom: 0,
              width: '1px',
              backgroundColor: '#e0e0e0',
            },
          }}
        >
          {node.children.map((child) =>
            child.kind === 'folder' ? (
              <FolderItem
                key={child.id}
                node={child}
                level={level + 1}
                onFileClick={onFileClick}
                onContext={onContext}
                path={[...path, child.id]}
                forceShowMenu={forceShowMenu}
                isFolderOpen={isFolderOpen}
                onToggle={onToggle}
              />
            ) : (
              <FileItem
                key={child.id}
                node={child}
                level={level + 1}
                onClick={() => onFileClick([...path, child.id], child.name)}
                onContext={(e) => onContext('file', [...path, child.id], e)}
              />
            ),
          )}
        </List>
      </Collapse>
    </>
  );
});

