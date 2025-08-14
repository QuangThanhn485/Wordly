import React, { memo, useCallback, useMemo, useState } from 'react';
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
  Paper,
  Divider,
  Tooltip,
  styled,
  tableCellClasses,
  Menu,
  MenuItem,
  ListItemIcon,
  useMediaQuery,
  useTheme,
  TableContainer,
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
  MoreVert as MoreIcon,
} from '@mui/icons-material';

export type VocabItem = {
  word: string;
  type: string;
  vnMeaning: string;
  pronunciation: string;
};
export type FileLeaf = { kind: 'file'; name: string };
export type FolderNode = { kind: 'folder'; label: string; children: Array<FolderNode | FileLeaf> };

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

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[100],
    fontWeight: 'bold',
    color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    color: theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.text.primary,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.background.paper,
  '&:nth-of-type(odd)': {
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.action.hover,
  },
  '&:last-child td, &:last-child th': { border: 0 },
}));

const FolderItem = memo(function FolderItem({
  node,
  level = 0,
  onFileClick,
  forceShowMenu = false,
}: {
  node: FolderNode;
  level?: number;
  onFileClick: (fileName: string) => void;
  forceShowMenu?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);

  const handleToggle = useCallback(() => setOpen((v) => !v), []);
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX - 2, mouseY: event.clientY - 4 });
  }, []);
  const handleCloseMenu = useCallback(() => setContextMenu(null), []);
  const handleAction = useCallback(
    (action: string) => {
      console.log(`${action} folder: ${node.label}`);
      handleCloseMenu();
    },
    [handleCloseMenu, node.label],
  );

  return (
    <>
      <Box sx={{ position: 'relative', '&:hover .folder-menu-icon': { opacity: 1 } }}>
        <ListItemButton
          onClick={handleToggle}
          onContextMenu={handleContextMenu}
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
              handleContextMenu(e as unknown as React.MouseEvent);
            }}
            sx={{
              opacity: forceShowMenu ? 1 : 0,
              transition: 'opacity 0.2s',
            }}
            aria-label={`Folder menu for ${node.label}`}
          >
            <MoreIcon fontSize="small" />
          </IconButton>
          {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </ListItemButton>
      </Box>

      <Menu
        open={Boolean(contextMenu)}
        onClose={handleCloseMenu}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
      >
        <MenuItem onClick={() => handleAction('import')}>
          <ListItemIcon><ImportIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Import file</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('rename')}>
          <ListItemIcon><RenameIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => handleAction('cut')}>
          <ListItemIcon><CutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Cut</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('copy')}>
          <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Copy</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction('paste')}>
          <ListItemIcon><PasteIcon fontSize="small" /></ListItemIcon>
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
              backgroundColor: '#e0e0e0',
            },
          }}
        >
          {node.children.map((child, idx) =>
            child.kind === 'folder' ? (
              <FolderItem key={`${child.label}-${idx}`} node={child} level={level + 1} onFileClick={onFileClick} forceShowMenu={forceShowMenu} />
            ) : (
              <FileItem key={`${child.name}-${idx}`} name={child.name} onClick={onFileClick} level={level + 1} />
            ),
          )}
        </List>
      </Collapse>
    </>
  );
});

const FileItem = memo(function FileItem({
  name,
  onClick,
  level = 0,
}: {
  name: string;
  onClick: (fileName: string) => void;
  level?: number;
}) {
  const handleClick = useCallback(() => onClick(name), [name, onClick]);
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
      onClick={handleClick}
      aria-label={`Open file ${name}`}
    >
      <FileIcon color="action" sx={{ mr: 1 }} />
      <ListItemText primary={<Typography variant="body1">{name}</Typography>} />
    </ListItemButton>
  );
});

const speak = (text: string) => {
  if (typeof window === 'undefined') return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  synth.speak(utter);
};

const TOTAL_LEFT_BAND = 520;

const Home: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'), { noSsr: true });
  const isSmDown = useMediaQuery(theme.breakpoints.down('sm'), { noSsr: true });

  const sidebarWidth = useMemo(
    () => (isMdDown ? '100%' : `clamp(220px, calc(${TOTAL_LEFT_BAND}px - var(--nav-w, 240px)), 360px)`),
    [isMdDown],
  );

  const handleFileClick = useCallback((fileName: string) => setSelectedFile(fileName), []);
  const selectedTitle = useMemo(() => selectedFile?.replace(/\.txt$/i, '') ?? '', [selectedFile]);

  const tree: FolderNode = useMemo(
    () => ({
      kind: 'folder',
      label: 'Từ vựng theo chủ đề',
      children: [
        { kind: 'folder', label: 'Thực phẩm & Ăn uống', children: [{ kind: 'file', name: 'vocab1.txt' }] },
        {
          kind: 'folder',
          label: 'Hoạt động hàng ngày',
          children: [
            { kind: 'folder', label: 'Vận động', children: [{ kind: 'file', name: 'vocab2.txt' }] },
            { kind: 'folder', label: 'Sinh hoạt', children: [{ kind: 'file', name: 'vocab3.txt' }] },
          ],
        },
        {
          kind: 'folder',
          label: 'Học tập',
          children: [
            {
              kind: 'folder',
              label: 'Tài liệu',
              children: [{ kind: 'folder', label: 'Sách vở', children: [{ kind: 'file', name: 'vocab4.txt' }] }],
            },
          ],
        },
      ],
    }),
    [],
  );

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: { xs: '100%', md: sidebarWidth },
          flexShrink: 0,
          borderRight: { xs: 'none', md: `1px solid ${theme.palette.divider}` },
          borderBottom: { xs: `1px solid ${theme.palette.divider}`, md: 'none' },
          height: { xs: '40vh', sm: '45vh', md: '100%' },
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          transition: theme.transitions.create(['width', 'height'], {
            duration: theme.transitions.duration.standard,
            easing: theme.transitions.easing.easeInOut,
          }),
        }}
      >
        <Box sx={{ px: 2, pt: 3, pb: 2, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <MenuBookIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant={isSmDown ? 'subtitle1' : 'h6'} sx={{ fontWeight: 600 }}>
              Thư mục
            </Typography>
          </Box>
          <Divider sx={{ mb: 0 }} />
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pt: 0 }}>
          <List>
            <FolderItem node={tree} onFileClick={handleFileClick} forceShowMenu={isMdDown} />
          </List>
        </Box>
      </Paper>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: { xs: '60vh', sm: '55vh', md: '100%' },
        }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 2, flexShrink: 0 }}>
          {selectedFile ? (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CategoryIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant={isSmDown ? 'h6' : 'h5'} sx={{ fontWeight: 600 }}>
                {selectedTitle}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CategoryIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant={isSmDown ? 'h6' : 'h5'} sx={{ fontWeight: 600 }}>
                Từ vựng
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', px: { xs: 2, md: 3 }, pb: { xs: 2, md: 3 } }}>
          {selectedFile ? (
            <Paper elevation={0} sx={{ border: `1px solid ${theme.palette.divider}` }}>
              <TableContainer sx={{ maxHeight: { xs: '50vh', md: 'unset' } }}>
                <Table
                  aria-label="vocabulary table"
                  stickyHeader={isMdDown}
                  size={isSmDown ? 'small' : 'medium'}
                  sx={{ minWidth: 650 }}
                >
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
                    {vocabData[selectedFile]?.map((item) => (
                      <StyledTableRow key={item.word} hover>
                        <StyledTableCell sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{item.word}</StyledTableCell>
                        <StyledTableCell sx={{ wordBreak: 'break-word' }}>{item.vnMeaning}</StyledTableCell>
                        <StyledTableCell>
                          <Box
                            component="span"
                            sx={{
                              px: 1,
                              py: 0.5,
                              bgcolor: 'grey.100',
                              borderRadius: 1,
                              fontSize: 12,
                              color: 'grey.800',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.type}
                          </Box>
                        </StyledTableCell>
                        <StyledTableCell sx={{ whiteSpace: 'nowrap' }}>/ {item.pronunciation} /</StyledTableCell>
                        <StyledTableCell align="center">
                          <Tooltip title="Phát âm" arrow>
                            <IconButton
                              size={isSmDown ? 'small' : 'medium'}
                              onClick={() => speak(item.word)}
                              sx={{ '&:hover': { backgroundColor: 'primary.light', color: 'primary.main' } }}
                              aria-label={`Speak ${item.word}`}
                            >
                              <VolumeUpIcon fontSize={isSmDown ? 'small' : 'medium'} />
                            </IconButton>
                          </Tooltip>
                        </StyledTableCell>
                      </StyledTableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : (
            <Box
              sx={{
                height: '100%',
                minHeight: 240,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                px: 2,
              }}
            >
              <FileIcon sx={{ fontSize: 56, color: 'grey.400', mb: 1.5 }} />
              <Typography variant={isSmDown ? 'subtitle1' : 'h6'} color="text.secondary" sx={{ mb: 1 }}>
                Chưa có tệp nào được chọn
              </Typography>
              <Typography variant="body2" color="text.secondary">
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
