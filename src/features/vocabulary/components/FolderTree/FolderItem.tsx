import React, { memo, useCallback, useMemo } from 'react';
import { Box, Collapse, IconButton, List, ListItemButton, ListItemText, Typography, useMediaQuery, useTheme } from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  InsertDriveFile as FileIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import type { FolderNode, FileLeaf } from '../../types';

// ===== Sort Helper =====
/**
 * Sorts children: folders first (alphabetically), then files (alphabetically)
 * Both sorted by their display name (label for folders, name for files)
 */
const sortChildren = (children: Array<FolderNode | FileLeaf>): Array<FolderNode | FileLeaf> => {
  // Separate folders and files
  const folders: FolderNode[] = [];
  const files: FileLeaf[] = [];
  
  children.forEach((child) => {
    if (child.kind === 'folder') {
      folders.push(child);
    } else {
      files.push(child);
    }
  });
  
  // Sort folders by label (case-insensitive, Vietnamese-aware)
  folders.sort((a, b) => {
    const labelA = a.label.toLowerCase().trim();
    const labelB = b.label.toLowerCase().trim();
    return labelA.localeCompare(labelB, 'vi'); // Use Vietnamese locale for proper sorting
  });
  
  // Sort files by name (remove .txt extension for comparison, case-insensitive)
  files.sort((a, b) => {
    const nameA = a.name.replace(/\.txt$/i, '').toLowerCase().trim();
    const nameB = b.name.replace(/\.txt$/i, '').toLowerCase().trim();
    return nameA.localeCompare(nameB, 'vi'); // Use Vietnamese locale for proper sorting
  });
  
  // Return folders first, then files
  return [...folders, ...files];
};

// ===== File Item Component =====
export const FileItem = memo(function FileItem({
  node,
  onClick,
  level = 0,
  onContext,
  vocabCount,
  selected = false,
  forceShowMenu = false,
}: {
  node: FileLeaf;
  onClick: () => void;
  level?: number;
  onContext: (e: React.MouseEvent<HTMLElement>) => void;
  vocabCount?: number;
  selected?: boolean;
  forceShowMenu?: boolean;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const showMenuButton = forceShowMenu || isMobile;

  return (
    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <ListItemButton
        selected={selected}
        sx={{
          pl: 4 + level * 2,
          pr: showMenuButton ? 4 : 2,
          position: 'relative',
          flex: 1,
          '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
          '&.Mui-selected': {
            backgroundColor: 'rgba(25, 118, 210, 0.12)',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.16)',
            },
          },
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
        onContextMenu={isMobile ? undefined : onContext} // Disable context menu on mobile, use button instead
        aria-label={`File ${node.name}`}
      >
        <FileIcon sx={{ fontSize: '1rem', mr: 1, color: 'text.secondary' }} />
        <ListItemText 
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <Typography variant="body2">{node.name.replace(/\.txt$/i, '')}</Typography>
              {vocabCount !== undefined && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: 'text.secondary', 
                    ml: 1,
                    fontWeight: 500
                  }}
                >
                  ({vocabCount})
                </Typography>
              )}
            </Box>
          } 
        />
      </ListItemButton>
      {showMenuButton && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onContext(e);
          }}
          sx={{ 
            position: 'absolute',
            right: 4,
            opacity: 1,
          }}
          aria-label={`File menu for ${node.name}`}
        >
          <MoreIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
});

// ===== Folder Item Component (Recursive) =====
const FolderItemComponent = function FolderItem({
  node,
  level = 0,
  onFileClick,
  onContext,
  path,
  forceShowMenu = false,
  isFolderOpen,
  onToggle,
  vocabCountMap,
  selectedFileId,
}: {
  node: FolderNode;
  level?: number;
  onFileClick: (filePath: string[], fileName: string) => void;
  onContext: (type: 'folder' | 'file', path: string[], event: React.MouseEvent<HTMLElement>) => void;
  path: string[]; // ids from root to this node
  forceShowMenu?: boolean;
  isFolderOpen?: ((id: string) => boolean) | Set<string>; // Can be function or Set for direct lookup
  onToggle?: (folderId: string, open: boolean) => void;
  vocabCountMap?: Record<string, number>; // fileName -> count
  selectedFileId?: string | null; // Currently selected file ID
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const showMenuButton = forceShowMenu || isMobile;

  // Optimize: check if isFolderOpen is a Set (direct lookup) or function
  const open = !isFolderOpen 
    ? false
    : typeof isFolderOpen === 'function' 
      ? isFolderOpen(node.id) 
      : (isFolderOpen instanceof Set ? isFolderOpen.has(node.id) : false);
  
  
  const handleToggle = useCallback(() => {
    if (onToggle) {
      // Toggle based on current state from prop (not stale closure)
      const currentOpen = !isFolderOpen 
        ? false
        : typeof isFolderOpen === 'function' 
          ? isFolderOpen(node.id) 
          : (isFolderOpen instanceof Set ? isFolderOpen.has(node.id) : false);
      onToggle(node.id, !currentOpen);
    }
  }, [onToggle, node.id, isFolderOpen]);

  // Sort children alphabetically (folders first, then files)
  const sortedChildren = useMemo(() => sortChildren(node.children), [node.children]);

  return (
    <>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <ListItemButton
          onClick={handleToggle}
          onContextMenu={isMobile ? undefined : (e) => onContext('folder', path, e)} // Disable context menu on mobile
          sx={{
            pl: 2 + level * 2,
            pr: showMenuButton ? 4 : 2,
            position: 'relative',
            flex: 1,
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
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </ListItemButton>
        {showMenuButton && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onContext('folder', path, e);
            }}
            sx={{ 
              position: 'absolute',
              right: 4,
              opacity: 1,
            }}
            aria-label={`Folder menu for ${node.label}`}
          >
            <MoreIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Collapse 
        in={open} 
        timeout={300}
        unmountOnExit={false}
      >
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
          {sortedChildren.map((child) =>
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
                vocabCountMap={vocabCountMap}
                selectedFileId={selectedFileId}
              />
            ) : (
              <FileItem
                key={child.id}
                node={child}
                level={level + 1}
                onClick={() => onFileClick([...path, child.id], child.name)}
                onContext={(e) => onContext('file', [...path, child.id], e)}
                vocabCount={vocabCountMap?.[child.name]}
                selected={child.id === selectedFileId}
                forceShowMenu={forceShowMenu}
              />
            ),
          )}
        </List>
      </Collapse>
    </>
  );
};

// Memoize component for performance - React will handle re-renders when props change
export const FolderItem = memo(FolderItemComponent);

