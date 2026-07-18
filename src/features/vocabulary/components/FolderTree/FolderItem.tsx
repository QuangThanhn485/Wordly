import React, { memo, useCallback, useMemo } from 'react';
import { Box, Collapse, IconButton, List, ListItemButton, Tooltip, Typography } from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  ChevronDown as ExpandMoreIcon,
  ChevronUp as ExpandLessIcon,
  FileText as FileIcon,
  MoreVertical as MoreIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FolderNode, FileLeaf } from '../../types';
import { removeFileExtension } from '@/utils/fileUtils';

const MAX_VISIBLE_INDENT_LEVEL = 6;
const TREE_ROW_HEIGHT = 40;

const getRowPaddingLeft = (level: number): number => 8 + Math.min(level, MAX_VISIBLE_INDENT_LEVEL) * 16;

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
    const nameA = removeFileExtension(a.name).toLowerCase().trim();
    const nameB = removeFileExtension(b.name).toLowerCase().trim();
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
  const { t } = useTranslation('vocabulary');
  const displayName = removeFileExtension(node.name);

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        minWidth: 0,
        mx: 0.5,
        mb: 0.25,
        '&:hover .tree-menu-button, &:focus-within .tree-menu-button': {
          opacity: 1,
          pointerEvents: 'auto',
        },
      }}
    >
      <ListItemButton
        selected={selected}
        sx={{
          minWidth: 0,
          minHeight: TREE_ROW_HEIGHT,
          height: TREE_ROW_HEIGHT,
          pl: `${getRowPaddingLeft(level)}px`,
          pr: '40px',
          py: 0,
          borderRadius: 1,
          position: 'relative',
          flex: 1,
          '&:hover': { backgroundColor: 'action.hover' },
          '&.Mui-selected': {
            backgroundColor: 'action.selected',
            '&:hover': {
              backgroundColor: 'action.selected',
            },
          },
        }}
        onClick={onClick}
        onContextMenu={forceShowMenu ? undefined : onContext}
        aria-label={t('actions.fileAriaLabel', { name: displayName })}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '18px 18px minmax(0, 1fr) auto',
            alignItems: 'center',
            columnGap: 0.75,
            width: '100%',
            minWidth: 0,
          }}
        >
          <Box aria-hidden sx={{ width: 18, height: 18 }} />
          <FileIcon size={17} aria-hidden />
          <Tooltip title={displayName} placement="right" enterDelay={500}>
            <Typography variant="body2" noWrap sx={{ minWidth: 0, fontWeight: selected ? 600 : 400 }}>
              {displayName}
            </Typography>
          </Tooltip>
          {vocabCount !== undefined && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ ml: 0.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
            >
              {vocabCount}
            </Typography>
          )}
        </Box>
      </ListItemButton>
      <Tooltip title={t('actions.fileMenuAriaLabel', { name: displayName })} placement="right">
        <IconButton
          className="tree-menu-button"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onContext(e);
          }}
          sx={{
            position: 'absolute',
            right: 6,
            width: 28,
            height: 28,
            opacity: forceShowMenu ? 1 : 0,
            pointerEvents: forceShowMenu ? 'auto' : 'none',
            transition: 'opacity 120ms ease',
          }}
          aria-label={t('actions.fileMenuAriaLabel', { name: displayName })}
        >
          <MoreIcon size={17} />
        </IconButton>
      </Tooltip>
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
  const { t } = useTranslation('vocabulary');

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
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          minWidth: 0,
          mx: 0.5,
          mb: 0.25,
          '&:hover .tree-menu-button, &:focus-within .tree-menu-button': {
            opacity: 1,
            pointerEvents: 'auto',
          },
        }}
      >
        <ListItemButton
          onClick={handleToggle}
          onContextMenu={forceShowMenu ? undefined : (e) => onContext('folder', path, e)}
          sx={{
            minWidth: 0,
            minHeight: TREE_ROW_HEIGHT,
            height: TREE_ROW_HEIGHT,
            pl: `${getRowPaddingLeft(level)}px`,
            pr: '40px',
            py: 0,
            borderRadius: 1,
            position: 'relative',
            flex: 1,
            '&:hover': { backgroundColor: 'action.hover' },
          }}
          aria-expanded={open}
          aria-label={t('actions.folderToggleAriaLabel', { name: node.label })}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '18px 18px minmax(0, 1fr)',
              alignItems: 'center',
              columnGap: 0.75,
              width: '100%',
              minWidth: 0,
            }}
          >
            {open ? <ExpandLessIcon size={17} aria-hidden /> : <ExpandMoreIcon size={17} aria-hidden />}
            {open ? <FolderOpenIcon size={18} aria-hidden /> : <FolderIcon size={18} aria-hidden />}
            <Tooltip title={node.label} placement="right" enterDelay={500}>
              <Typography variant="body2" noWrap sx={{ minWidth: 0, fontWeight: 600 }}>
                {node.label}
              </Typography>
            </Tooltip>
          </Box>
        </ListItemButton>
        <Tooltip title={t('actions.folderMenuAriaLabel', { name: node.label })} placement="right">
          <IconButton
            className="tree-menu-button"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onContext('folder', path, e);
            }}
            sx={{
              position: 'absolute',
              right: 6,
              width: 28,
              height: 28,
              opacity: forceShowMenu ? 1 : 0,
              pointerEvents: forceShowMenu ? 'auto' : 'none',
              transition: 'opacity 120ms ease',
            }}
            aria-label={t('actions.folderMenuAriaLabel', { name: node.label })}
          >
            <MoreIcon size={17} />
          </IconButton>
        </Tooltip>
      </Box>

      <Collapse 
        in={open} 
        timeout={180}
        unmountOnExit
      >
        <List component="div" disablePadding>
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
