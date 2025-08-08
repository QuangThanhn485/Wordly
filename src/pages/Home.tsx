import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Grid,
  Paper,
  Divider,
  Tooltip,
  styled,
  tableCellClasses,
  Menu,
  MenuItem,
  ListItemIcon
} from '@mui/material';
import {
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFile as FileIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  VolumeUp as VolumeUpIcon,
  MenuBook as MenuBookIcon,
  Category as CategoryIcon,
  DriveFileRenameOutline as RenameIcon,
  ContentCopy as CopyIcon,
  ContentCut as CutIcon,
  ContentPaste as PasteIcon,
  FileUpload as ImportIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';

// Kiểu dữ liệu từ vựng
type VocabItem = {
  word: string;
  type: string;
  vnMeaning: string;
  pronunciation: string;
};

// Dữ liệu mô phỏng
const vocabData: Record<string, VocabItem[]> = {
  'vocab1.txt': [
    { word: 'apple', type: 'noun', vnMeaning: 'quả táo', pronunciation: 'ˈæp.əl' },
    { word: 'eat', type: 'verb', vnMeaning: 'ăn', pronunciation: 'iːt' },
    { word: 'delicious', type: 'adjective', vnMeaning: 'ngon', pronunciation: 'dɪˈlɪʃ.əs' },
  ],
  'vocab2.txt': [
    { word: 'run', type: 'verb', vnMeaning: 'chạy', pronunciation: 'rʌn' },
    { word: 'quickly', type: 'adverb', vnMeaning: 'một cách nhanh chóng', pronunciation: 'ˈkwɪk.li' },
    { word: 'tired', type: 'adjective', vnMeaning: 'mệt', pronunciation: 'taɪəd' },
  ],
  'vocab3.txt': [
    { word: 'drink', type: 'verb', vnMeaning: 'uống', pronunciation: 'drɪŋk' },
    { word: 'water', type: 'noun', vnMeaning: 'nước', pronunciation: 'ˈwɔː.tər' },
  ],
  'vocab4.txt': [
    { word: 'study', type: 'verb', vnMeaning: 'học', pronunciation: 'ˈstʌd.i' },
    { word: 'book', type: 'noun', vnMeaning: 'sách', pronunciation: 'bʊk' },
  ],
};

// Styled components
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.grey[100],
    fontWeight: 'bold',
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));

// Folder component
const Folder = ({
  label,
  children,
  level = 0,
}: {
  label: string;
  children?: React.ReactNode;
  level?: number;
}) => {
  const [open, setOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
  } | null>(null);
  
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
          }
        : null,
    );
  };

  const handleClose = () => {
    setContextMenu(null);
  };

  const handleAction = (action: string) => {
    console.log(`${action} folder: ${label}`);
    handleClose();
    // Thêm logic xử lý cho từng action ở đây
  };

  return (
    <>
      <ListItemButton 
        onClick={() => setOpen(!open)} 
        onContextMenu={handleContextMenu}
        sx={{ 
          pl: 2 + level * 2,
          position: 'relative',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)'
          },
          '&::before': level > 0 ? {
            content: '""',
            position: 'absolute',
            left: 20 + (level - 1) * 20,
            top: 0,
            bottom: 0,
            width: '1px',
            backgroundColor: '#e0e0e0'
          } : undefined
        }}
      >
        {open ? <FolderOpenIcon color="primary" sx={{ mr: 1 }} /> : <FolderIcon color="primary" sx={{ mr: 1 }} />}
        <ListItemText 
          primary={
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {label}
            </Typography>
          } 
        />
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleContextMenu(e);
          }}
          sx={{ opacity: 0.5, '&:hover': { opacity: 1 } }}
        >
          <MoreIcon fontSize="small" />
        </IconButton>
        {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </ListItemButton>

      <Menu
        open={contextMenu !== null}
        onClose={handleClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => handleAction('import')}>
          <ListItemIcon>
            <ImportIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Import file</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('rename')}>
          <ListItemIcon>
            <RenameIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleAction('cut')}>
          <ListItemIcon>
            <CutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Cut</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('copy')}>
          <ListItemIcon>
            <CopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('paste')}>
          <ListItemIcon>
            <PasteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Paste</ListItemText>
        </MenuItem>
      </Menu>

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
              backgroundColor: '#e0e0e0'
            }
          }}
        >
          {children}
        </List>
      </Collapse>
    </>
  );
};

// File component
const File = ({
  name,
  onClick,
  level = 0,
}: {
  name: string;
  onClick: (fileName: string) => void;
  level?: number;
}) => (
  <ListItemButton 
    sx={{ 
      pl: 4 + level * 2,
      position: 'relative',
      '&:hover': {
        backgroundColor: 'rgba(0, 0, 0, 0.04)'
      },
      // Thêm đường kẻ dọc cho các file con
      '&::before': level > 0 ? {
        content: '""',
        position: 'absolute',
        left: 20 + (level - 1) * 20,
        top: 0,
        bottom: 0,
        width: '1px',
        backgroundColor: '#e0e0e0'
      } : undefined
    }} 
    onClick={() => onClick(name)}
  >
    <FileIcon color="action" sx={{ mr: 1 }} />
    <ListItemText 
      primary={
        <Typography variant="body1">
          {name}
        </Typography>
      } 
    />
  </ListItemButton>
);

// Component chính
const Home = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const handleFileClick = (fileName: string) => {
    setSelectedFile(fileName);
  };

  const handleSpeak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    speechSynthesis.speak(utterance);
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      {/* Sidebar cây thư mục */}
      <Paper 
        elevation={0} 
        sx={{ 
          width: 'auto', 
          marginRight: 'auto',
          borderRight: '1px solid #e0e0e0', 
          overflowY: 'auto', 
          height: '100%',
          borderRadius: 0
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <MenuBookIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Từ vựng tiếng Anh
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List>
            <Folder label="Từ vựng theo chủ đề">
              <Folder label="Thực phẩm & Ăn uống" level={1}>
                <File name="vocab1.txt" onClick={handleFileClick} level={1} />
              </Folder>
              <Folder label="Hoạt động hàng ngày" level={1}>
                <Folder label="Vận động" level={2}>
                  <File name="vocab2.txt" onClick={handleFileClick} level={2} />
                </Folder>
                <Folder label="Sinh hoạt" level={2}>
                  <File name="vocab3.txt" onClick={handleFileClick} level={2} />
                </Folder>
              </Folder>
              <Folder label="Học tập" level={1}>
                <Folder label="Tài liệu" level={2}>
                  <Folder label="Sách vở" level={3}>
                    <File name="vocab4.txt" onClick={handleFileClick} level={3} />
                  </Folder>
                </Folder>
              </Folder>
            </Folder>
          </List>
        </Box>
      </Paper>

      {/* Nội dung chính */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Box sx={{ p: 3 }}>
          {selectedFile ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <CategoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {selectedFile.replace('.txt', '')}
                </Typography>
              </Box>
              
              <Paper elevation={0} sx={{ overflow: 'hidden', border: '1px solid #e0e0e0' }}>
                <Table sx={{ minWidth: 650 }} aria-label="vocabulary table">
                <TableHead>
                    <TableRow>
                    <StyledTableCell>Từ vựng</StyledTableCell>
                    <StyledTableCell>Nghĩa tiếng Việt</StyledTableCell>
                    <StyledTableCell>Từ loại</StyledTableCell>
                    <StyledTableCell>Phát âm</StyledTableCell>
                    <StyledTableCell align="center">Nghe</StyledTableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {vocabData[selectedFile]?.map((item, index) => (
                      <StyledTableRow key={index} hover>
                        <StyledTableCell sx={{ fontWeight: 500 }}>{item.word}</StyledTableCell>
                        <StyledTableCell>{item.vnMeaning}</StyledTableCell>
                        <StyledTableCell>
                          <Box 
                            component="span" 
                            sx={{
                              px: 1,
                              py: 0.5,
                              bgcolor: 'grey.100',
                              borderRadius: 1,
                              fontSize: 12,
                              color: 'grey.800'
                            }}
                          >
                            {item.type}
                          </Box>
                        </StyledTableCell>
                        <StyledTableCell>/ {item.pronunciation} /</StyledTableCell>
                        <StyledTableCell align="center">
                          <Tooltip title="Phát âm" arrow>
                            <IconButton 
                              size="small" 
                              onClick={() => handleSpeak(item.word)}
                              sx={{ 
                                '&:hover': {
                                  backgroundColor: 'primary.light',
                                  color: 'primary.main'
                                }
                              }}
                            >
                              <VolumeUpIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </StyledTableCell>
                      </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </>
          ) : (
            <Box
              sx={{
                height: '70vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}
            >
              <FileIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                Chưa có tệp nào được chọn
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Vui lòng chọn một tệp từ danh sách bên trái để xem nội dung
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Home;