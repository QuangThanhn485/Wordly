import React from 'react';
import {
  Box,
  Card,
  CardActionArea,
  Typography,
  styled,
  alpha,
} from '@mui/material';
import { Folder as FolderIcon, FileText as FileIcon } from 'lucide-react';
import type { FolderNode, FileLeaf } from '../../types';

// ===== Types =====
interface FolderGridViewProps {
  items: (FolderNode | FileLeaf)[];
  onFolderClick: (folder: FolderNode) => void;
  onFileClick: (file: FileLeaf) => void;
  onContext: (item: FolderNode | FileLeaf, e: React.MouseEvent) => void;
  selectedFileName?: string | null;
  vocabCountMap?: Record<string, number>; // fileName -> count
  onEmptySpaceContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void; // For empty space right-click
}

// ===== Styled Components =====
const GridCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: 200,
  }),
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: theme.spacing(3, 2, 1, 2),
  '& .MuiSvgIcon-root': {
    fontSize: 64,
  },
}));

// ===== Component =====
export const FolderGridView: React.FC<FolderGridViewProps> = ({
  items,
  onFolderClick,
  onFileClick,
  onContext,
  selectedFileName,
  vocabCountMap,
  onEmptySpaceContextMenu,
}) => {
  const handleClick = (item: FolderNode | FileLeaf) => {
    if (item.kind === 'folder') {
      onFolderClick(item);
    } else {
      onFileClick(item);
    }
  };

  const handleContextMenu = (item: FolderNode | FileLeaf, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent
    onContext(item, e);
  };

  const handleGridContainerContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    // Check if click is on empty space (not on any Card)
    const isOnCard = target.closest('.MuiCard-root') || target.closest('.MuiCardActionArea-root');
    
    if (!isOnCard && onEmptySpaceContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      onEmptySpaceContextMenu(e as React.MouseEvent<HTMLDivElement>);
    }
  };

  return (
    <Box 
      sx={{ p: 2 }}
      onContextMenu={handleGridContainerContextMenu}
    >
      {items.length > 0 ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
              lg: 'repeat(6, 1fr)',
            },
            gap: 2,
          }}
          onContextMenu={handleGridContainerContextMenu}
        >
          {items.map((item) => {
            const isSelected = item.kind === 'file' && item.name === selectedFileName;
            // Remove .txt extension from file name for display
            const label = item.kind === 'folder' ? item.label : item.name.replace(/\.txt$/i, '');

            return (
              <GridCard
                key={item.id}
                elevation={isSelected ? 3 : 1}
                sx={(theme) => ({
                  backgroundColor: isSelected
                    ? alpha(theme.palette.primary.main, 0.08)
                    : 'background.paper',
                  border: isSelected
                    ? `2px solid ${theme.palette.primary.main}`
                    : `1px solid ${theme.palette.divider}`,
                })}
              >
                <CardActionArea
                  onClick={() => handleClick(item)}
                  onContextMenu={(e) => handleContextMenu(item, e)}
                  sx={{ height: '100%' }}
                >
                  <IconWrapper>
                    {item.kind === 'folder' ? (
                      <FolderIcon size={64} color="currentColor" style={{ color: 'inherit' }} />
                    ) : (
                      <FileIcon size={64} color="currentColor" style={{ color: 'inherit' }} />
                    )}
                  </IconWrapper>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <Typography
                      variant="body2"
                      align="center"
                      sx={{
                        fontWeight: isSelected ? 600 : 400,
                        wordBreak: 'break-word',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {label}
                    </Typography>
                    {item.kind === 'file' && vocabCountMap?.[item.name] !== undefined && (
                      <Typography
                        variant="caption"
                        align="center"
                        sx={{
                          color: 'text.secondary',
                          mt: 0.5,
                          display: 'block',
                          fontWeight: 500,
                        }}
                      >
                        ({vocabCountMap[item.name]} từ)
                      </Typography>
                    )}
                  </Box>
                </CardActionArea>
              </GridCard>
            );
          })}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 200,
            pointerEvents: 'none', // Prevent click events on empty folder message
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Thư mục trống
          </Typography>
        </Box>
      )}
    </Box>
  );
};

