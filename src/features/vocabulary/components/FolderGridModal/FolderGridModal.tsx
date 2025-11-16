import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { X as CloseIcon, FolderOpen as FolderOpenIcon } from 'lucide-react';
import type { FolderNode, FileLeaf } from '../../types';
import { FolderGridView } from '../FolderGrid/FolderGridView';
import { BreadcrumbNav, type BreadcrumbItem } from '../FolderGrid/Breadcrumb';

// ===== Types =====
interface FolderGridModalProps {
  open: boolean;
  onClose: () => void;
  currentFolder: FolderNode;
  breadcrumbPath: BreadcrumbItem[];
  selectedFileName: string | null;
  onFolderClick: (folder: FolderNode) => void;
  onFileClick: (file: FileLeaf) => void;
  onBreadcrumbNavigate: (folderId: string) => void;
  onContextMenu: (item: FolderNode | FileLeaf, e: React.MouseEvent) => void;
  onEmptySpaceContextMenu: (e: React.MouseEvent) => void;
  vocabCountMap?: Record<string, number>; // fileName -> count
}

// ===== Component =====
export const FolderGridModal: React.FC<FolderGridModalProps> = ({
  open,
  onClose,
  currentFolder,
  breadcrumbPath,
  selectedFileName,
  onFolderClick,
  onFileClick,
  onBreadcrumbNavigate,
  onContextMenu,
  onEmptySpaceContextMenu,
  vocabCountMap,
}) => {
  const theme = useTheme();
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'));

  const handleEmptySpaceContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onEmptySpaceContextMenu(e);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isSmDown}
      PaperProps={{
        sx: {
          height: isSmDown ? '100%' : '85vh',
          maxHeight: isSmDown ? '100%' : '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
          py: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FolderOpenIcon color="primary" />
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            Chọn file từ vựng
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Đóng">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Breadcrumb */}
        <BreadcrumbNav path={breadcrumbPath} onNavigate={onBreadcrumbNavigate} />

        {/* Grid View */}
        <Box
          sx={{ flex: 1, overflowY: 'auto' }}
          onContextMenu={handleEmptySpaceContextMenu}
        >
          <FolderGridView
            items={currentFolder.children}
            onFolderClick={onFolderClick}
            onFileClick={onFileClick}
            onContext={onContextMenu}
            selectedFileName={selectedFileName}
            vocabCountMap={vocabCountMap}
            onEmptySpaceContextMenu={handleEmptySpaceContextMenu}
          />
        </Box>

        {/* Helper text */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            💡 Click vào thư mục để mở, click vào file để xem từ vựng
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

