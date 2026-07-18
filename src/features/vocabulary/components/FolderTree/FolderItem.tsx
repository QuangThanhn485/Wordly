import React, { memo, useCallback, useMemo } from 'react';
import { Box, Collapse, IconButton, List, ListItemButton, Tooltip, Typography } from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  ChevronDown as ExpandMoreIcon,
  ChevronUp as ExpandLessIcon,
  BookOpen as TopicIcon,
  MoreVertical as MoreIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FolderNode, TopicItem } from '../../types';

const MAX_VISIBLE_INDENT_LEVEL = 6;
const TREE_ROW_HEIGHT = 40;

const getRowPaddingLeft = (level: number): number => 8 + Math.min(level, MAX_VISIBLE_INDENT_LEVEL) * 16;

// ===== Sort Helper =====
/**
 * Sorts children: folders first, then topics, both Vietnamese-aware.
 */
const sortChildren = (children: Array<FolderNode | TopicItem>): Array<FolderNode | TopicItem> => {
  const folders: FolderNode[] = [];
  const topics: TopicItem[] = [];
  
  children.forEach((child) => {
    if (child.kind === 'folder') {
      folders.push(child);
    } else {
      topics.push(child);
    }
  });
  
  // Sort folders by label (case-insensitive, Vietnamese-aware)
  folders.sort((a, b) => {
    const labelA = a.label.toLowerCase().trim();
    const labelB = b.label.toLowerCase().trim();
    return labelA.localeCompare(labelB, 'vi'); // Use Vietnamese locale for proper sorting
  });
  
  topics.sort((a, b) => {
    const labelA = a.label.toLocaleLowerCase('vi').trim();
    const labelB = b.label.toLocaleLowerCase('vi').trim();
    return labelA.localeCompare(labelB, 'vi');
  });
  
  return [...folders, ...topics];
};

// ===== Topic Item Component =====
export const TopicTreeItem = memo(function TopicTreeItem({
  node,
  onClick,
  level = 0,
  onContext,
  vocabCount,
  selected = false,
  forceShowMenu = false,
}: {
  node: TopicItem;
  onClick: () => void;
  level?: number;
  onContext: (e: React.MouseEvent<HTMLElement>) => void;
  vocabCount?: number;
  selected?: boolean;
  forceShowMenu?: boolean;
}) {
  const { t } = useTranslation('vocabulary');
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
        aria-label={t('actions.topicAriaLabel', { name: node.label })}
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
          <TopicIcon size={17} aria-hidden />
          <Tooltip
            title={node.label}
            placement="top-start"
            enterDelay={650}
            enterNextDelay={650}
            disableInteractive
          >
            <Typography
              data-vocabulary-tree-label
              variant="body2"
              noWrap
              sx={{ minWidth: 0, fontWeight: selected ? 600 : 400 }}
            >
              {node.label}
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
      <Tooltip title={t('actions.topicMenuAriaLabel', { name: node.label })} placement="right">
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
          aria-label={t('actions.topicMenuAriaLabel', { name: node.label })}
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
  onTopicClick,
  onContext,
  path,
  forceShowMenu = false,
  isFolderOpen,
  onToggle,
  vocabCountMap,
  selectedTopicId,
}: {
  node: FolderNode;
  level?: number;
  onTopicClick: (topicPath: string[], topicId: string) => void;
  onContext: (type: 'folder' | 'topic', path: string[], event: React.MouseEvent<HTMLElement>) => void;
  path: string[]; // ids from root to this node
  forceShowMenu?: boolean;
  isFolderOpen?: ((id: string) => boolean) | Set<string>; // Can be function or Set for direct lookup
  onToggle?: (folderId: string, open: boolean) => void;
  vocabCountMap?: Record<string, number>; // topicId -> count
  selectedTopicId?: string | null;
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
            <Tooltip
              title={node.label}
              placement="top-start"
              enterDelay={650}
              enterNextDelay={650}
              disableInteractive
            >
              <Typography
                data-vocabulary-tree-label
                variant="body2"
                noWrap
                sx={{ minWidth: 0, fontWeight: 600 }}
              >
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
                onTopicClick={onTopicClick}
                onContext={onContext}
                path={[...path, child.id]}
                forceShowMenu={forceShowMenu}
                isFolderOpen={isFolderOpen}
                onToggle={onToggle}
                vocabCountMap={vocabCountMap}
                selectedTopicId={selectedTopicId}
              />
            ) : (
              <TopicTreeItem
                key={child.id}
                node={child}
                level={level + 1}
                onClick={() => onTopicClick([...path, child.id], child.id)}
                onContext={(e) => onContext('topic', [...path, child.id], e)}
                vocabCount={vocabCountMap?.[child.id]}
                selected={child.id === selectedTopicId}
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
