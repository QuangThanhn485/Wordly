import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  X as ClearIcon,
  Folder as FolderIcon,
  BookOpen as TopicIcon,
  Type as WordIcon,
  CaseSensitive as CaseIcon,
  CornerDownLeft as EnterIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FolderNode, VocabItem } from '../../types';
import {
  collectScopeEntries,
  getHighlightRange,
  makeNormalizer,
  searchFolders,
  searchTopics,
  searchTopicVocab,
  type FolderSearchResult,
  type TopicSearchResult,
  type VocabSearchResult,
  type VocabTarget,
} from '../../utils/search';

/** Cap on how many rows we render per group; total counts are still reported. */
const MAX_RESULTS_PER_GROUP = 300;
/** How many topics to scan before yielding to the event loop. */
const VOCAB_SCAN_BATCH = 12;

export interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  scopeNode: FolderNode | null;
  scopePath: string[];
  scopeLabel: string;
  /** Returns a topic's words (from memory cache or storage). */
  getTopicVocab: (topicId: string) => VocabItem[];
  /** Ancestor labels for a full id path, joined for display (excludes self). */
  breadcrumbOf: (path: string[]) => string;
  onSelectTopic: (path: string[]) => void;
  onRevealFolder: (path: string[]) => void;
  onSelectVocab: (topicPath: string[], item: VocabItem) => void;
}

type VocabGroup = {
  results: VocabSearchResult[];
  total: number;
};

const HighlightedText: React.FC<{
  value: string;
  range: [number, number] | null;
}> = ({ value, range }) => {
  if (!range) return <>{value}</>;
  const [start, end] = range;
  return (
    <>
      {value.slice(0, start)}
      <Box
        component="mark"
        sx={{
          px: 0.25,
          borderRadius: 0.5,
          bgcolor: 'warning.light',
          color: 'warning.contrastText',
          fontWeight: 700,
        }}
      >
        {value.slice(start, end)}
      </Box>
      {value.slice(end)}
    </>
  );
};

export const SearchDialog: React.FC<SearchDialogProps> = ({
  open,
  onClose,
  scopeNode,
  scopePath,
  scopeLabel,
  getTopicVocab,
  breadcrumbOf,
  onSelectTopic,
  onRevealFolder,
  onSelectVocab,
}) => {
  const { t } = useTranslation('vocabulary');
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [scopes, setScopes] = useState({ folders: true, topics: true, vocab: true });
  // Which vocabulary field the switch targets: English word or Vietnamese meaning.
  const [vocabTarget, setVocabTarget] = useState<'word' | 'meaning'>('word');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [diacriticSensitive, setDiacriticSensitive] = useState(false);

  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [folderResults, setFolderResults] = useState<FolderSearchResult[]>([]);
  const [topicResults, setTopicResults] = useState<TopicSearchResult[]>([]);
  const [vocabGroup, setVocabGroup] = useState<VocabGroup>({ results: [], total: 0 });
  const [lastQuery, setLastQuery] = useState('');

  // Identifies the active search run so a stale async pass can bail out.
  const runIdRef = useRef(0);

  // Descendant folders/topics of the scope. Cheap (catalog/tree only) and reused
  // across repeated searches in the same dialog session.
  const scopeEntries = useMemo(() => {
    if (!scopeNode) return { folders: [], topics: [] };
    return collectScopeEntries(scopeNode, scopePath);
  }, [scopeNode, scopePath]);

  const resetResults = useCallback(() => {
    runIdRef.current += 1;
    setSearching(false);
    setHasSearched(false);
    setFolderResults([]);
    setTopicResults([]);
    setVocabGroup({ results: [], total: 0 });
    setLastQuery('');
  }, []);

  // Reset everything each time the dialog (re)opens for a scope.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setScopes({ folders: true, topics: true, vocab: true });
    setVocabTarget('word');
    setCaseSensitive(false);
    setDiacriticSensitive(false);
    resetResults();
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [open, scopeNode, resetResults]);

  const noScopeSelected = !scopes.folders && !scopes.topics && !scopes.vocab;
  const canSearch = query.trim().length > 0 && !noScopeSelected;

  // English words are matched case-insensitively, so the case toggle is locked
  // off whenever the vocabulary switch is on "EN".
  const caseLocked = scopes.vocab && vocabTarget === 'word';
  const effectiveCaseSensitive = caseLocked ? false : caseSensitive;

  const runSearch = useCallback(async () => {
    const trimmed = query.trim();
    if (!trimmed || noScopeSelected || !scopeNode) return;

    const runId = ++runIdRef.current;
    const normalize = makeNormalizer({
      caseSensitive: effectiveCaseSensitive,
      diacriticSensitive,
    });
    const normalizedQuery = normalize(trimmed);

    setHasSearched(true);
    setLastQuery(trimmed);

    // Folder + topic name matches are instant (no word records touched).
    setFolderResults(
      scopes.folders
        ? searchFolders(scopeEntries.folders, normalizedQuery, normalize).slice(
            0,
            MAX_RESULTS_PER_GROUP,
          )
        : [],
    );
    setTopicResults(
      scopes.topics
        ? searchTopics(scopeEntries.topics, normalizedQuery, normalize).slice(
            0,
            MAX_RESULTS_PER_GROUP,
          )
        : [],
    );

    if (!scopes.vocab) {
      setVocabGroup({ results: [], total: 0 });
      setSearching(false);
      return;
    }

    // Vocabulary scan: only topics inside the scope, chunked so the dialog stays
    // responsive on large libraries, with progressive result flushing.
    setSearching(true);
    setVocabGroup({ results: [], total: 0 });

    const accumulated: VocabSearchResult[] = [];
    let total = 0;
    let processed = 0;

    for (const topicEntry of scopeEntries.topics) {
      if (runId !== runIdRef.current) return; // superseded or closed
      const items = getTopicVocab(topicEntry.node.id);
      const matches = searchTopicVocab(
        items,
        topicEntry.node.id,
        topicEntry.path,
        normalizedQuery,
        normalize,
        vocabTarget,
      );
      total += matches.length;
      for (const match of matches) {
        if (accumulated.length < MAX_RESULTS_PER_GROUP) accumulated.push(match);
      }

      processed += 1;
      if (processed % VOCAB_SCAN_BATCH === 0) {
        setVocabGroup({ results: [...accumulated], total });
        // Yield so React can paint progress and the UI stays interactive.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        if (runId !== runIdRef.current) return;
      }
    }

    if (runId !== runIdRef.current) return;
    setVocabGroup({ results: accumulated, total });
    setSearching(false);
  }, [
    query,
    noScopeSelected,
    scopeNode,
    effectiveCaseSensitive,
    diacriticSensitive,
    vocabTarget,
    scopes,
    scopeEntries,
    getTopicVocab,
  ]);

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (canSearch) void runSearch();
    },
    [canSearch, runSearch],
  );

  const normalizeForHighlight = useMemo(
    () => makeNormalizer({ caseSensitive: effectiveCaseSensitive, diacriticSensitive }),
    [effectiveCaseSensitive, diacriticSensitive],
  );
  const normalizedLastQuery = useMemo(
    () => (lastQuery ? normalizeForHighlight(lastQuery) : ''),
    [lastQuery, normalizeForHighlight],
  );

  const totalResults =
    folderResults.length + topicResults.length + vocabGroup.total;
  const showEmptyHint = !hasSearched;
  const showNoResults = hasSearched && !searching && totalResults === 0;

  const toggleScope = (key: keyof typeof scopes) =>
    setScopes((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          height: fullScreen ? '100%' : '80vh',
          maxHeight: fullScreen ? '100%' : '80vh',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <SearchIcon size={20} style={{ flexShrink: 0 }} />
          <Typography component="span" variant="h6" noWrap sx={{ minWidth: 0, fontWeight: 700 }}>
            {t('search.title', { scope: scopeLabel })}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, p: 0 }}
      >
        {/* Search controls */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            flexShrink: 0,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <TextField
              inputRef={inputRef}
              fullWidth
              size="small"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              autoComplete="off"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon size={18} />
                  </InputAdornment>
                ),
                endAdornment: query ? (
                  <InputAdornment position="end">
                    <Tooltip title={t('search.clear')}>
                      <IconButton
                        size="small"
                        edge="end"
                        onClick={() => {
                          setQuery('');
                          inputRef.current?.focus();
                        }}
                        aria-label={t('search.clear')}
                      >
                        <ClearIcon size={16} />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ) : null,
              }}
            />
            <Button
              type="submit"
              variant="contained"
              startIcon={
                searching ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SearchIcon size={17} />
                )
              }
              disabled={!canSearch}
              sx={{ flexShrink: 0, minWidth: { xs: 96, sm: 120 } }}
            >
              {searching ? t('search.searching') : t('search.button')}
            </Button>
          </Stack>

          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              rowGap: 1,
              columnGap: { xs: 1, sm: 2 },
            }}
          >
            {/* Scope: which kinds of items to search */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                {t('search.scopeLabel')}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <IconToggle
                  value="folders"
                  title={t('search.scopeFolders')}
                  selected={scopes.folders}
                  onToggle={() => toggleScope('folders')}
                >
                  <FolderIcon size={16} />
                </IconToggle>
                <IconToggle
                  value="topics"
                  title={t('search.scopeTopics')}
                  selected={scopes.topics}
                  onToggle={() => toggleScope('topics')}
                >
                  <TopicIcon size={16} />
                </IconToggle>
                <IconToggle
                  value="vocab"
                  title={t('search.scopeVocab')}
                  selected={scopes.vocab}
                  onToggle={() => toggleScope('vocab')}
                >
                  <WordIcon size={16} />
                </IconToggle>
              </Stack>
            </Box>

            {/* EN / VI switch: which vocabulary field to match */}
            <Tooltip title={t('search.vocabTargetHint')}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.25,
                  opacity: scopes.vocab ? 1 : 0.45,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: vocabTarget === 'word' ? 700 : 500,
                    color:
                      scopes.vocab && vocabTarget === 'word'
                        ? 'primary.main'
                        : 'text.secondary',
                  }}
                >
                  EN
                </Typography>
                <Switch
                  size="small"
                  checked={vocabTarget === 'meaning'}
                  disabled={!scopes.vocab}
                  onChange={(e) => setVocabTarget(e.target.checked ? 'meaning' : 'word')}
                  inputProps={{ 'aria-label': t('search.vocabTargetHint') }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: vocabTarget === 'meaning' ? 700 : 500,
                    color:
                      scopes.vocab && vocabTarget === 'meaning'
                        ? 'primary.main'
                        : 'text.secondary',
                  }}
                >
                  VI
                </Typography>
              </Box>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />

            {/* Matching options */}
            <Stack direction="row" spacing={0.5}>
              <IconToggle
                value="case"
                title={caseLocked ? t('search.caseDisabledForEn') : t('search.caseSensitive')}
                selected={effectiveCaseSensitive}
                disabled={caseLocked}
                onToggle={() => setCaseSensitive((v) => !v)}
              >
                <CaseIcon size={18} />
              </IconToggle>
              <IconToggle
                value="diacritic"
                title={t('search.diacriticSensitive')}
                selected={diacriticSensitive}
                onToggle={() => setDiacriticSensitive((v) => !v)}
              >
                <Box component="span" sx={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1 }}>
                  á
                </Box>
              </IconToggle>
            </Stack>
          </Box>
          {noScopeSelected && (
            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
              {t('search.selectAtLeastOne')}
            </Typography>
          )}
        </Box>

        {/* Results */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 1, sm: 2 }, py: 1 }}>
          {showEmptyHint ? (
            <ResultPlaceholder icon={<EnterIcon size={40} />} text={t('search.empty')} />
          ) : showNoResults ? (
            <ResultPlaceholder
              icon={<SearchIcon size={40} />}
              text={t('search.noResults', { query: lastQuery })}
            />
          ) : (
            <>
              {scopes.folders && folderResults.length > 0 && (
                <ResultSection
                  title={t('search.resultsFolders', { count: folderResults.length })}
                >
                  {folderResults.map((result) => (
                    <ListItemButton
                      key={result.id}
                      onClick={() => onRevealFolder(result.path)}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <FolderIcon size={18} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <HighlightedText
                            value={result.label}
                            range={getHighlightRange(
                              result.label,
                              normalizedLastQuery,
                              normalizeForHighlight,
                            )}
                          />
                        }
                        secondary={breadcrumbOf(result.path) || undefined}
                        primaryTypographyProps={{ noWrap: true, fontWeight: 600 }}
                        secondaryTypographyProps={{ noWrap: true, variant: 'caption' }}
                      />
                    </ListItemButton>
                  ))}
                </ResultSection>
              )}

              {scopes.topics && topicResults.length > 0 && (
                <ResultSection
                  title={t('search.resultsTopics', { count: topicResults.length })}
                >
                  {topicResults.map((result) => (
                    <ListItemButton
                      key={result.id}
                      onClick={() => onSelectTopic(result.path)}
                      sx={{ borderRadius: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <TopicIcon size={18} />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <HighlightedText
                            value={result.label}
                            range={getHighlightRange(
                              result.label,
                              normalizedLastQuery,
                              normalizeForHighlight,
                            )}
                          />
                        }
                        secondary={breadcrumbOf(result.path) || undefined}
                        primaryTypographyProps={{ noWrap: true, fontWeight: 600 }}
                        secondaryTypographyProps={{ noWrap: true, variant: 'caption' }}
                      />
                    </ListItemButton>
                  ))}
                </ResultSection>
              )}

              {scopes.vocab && vocabGroup.total > 0 && (
                <ResultSection
                  title={t('search.resultsVocab', { count: vocabGroup.total })}
                  note={
                    vocabGroup.total > vocabGroup.results.length
                      ? t('search.capped', {
                          shown: vocabGroup.results.length,
                          total: vocabGroup.total,
                        })
                      : undefined
                  }
                >
                  {vocabGroup.results.map((result, index) => {
                    const matchedValue =
                      result.field === 'word' ? result.item.word : result.item.vnMeaning;
                    return (
                      <ListItemButton
                        key={`${result.topicId}:${result.item.id || result.item.word}:${index}`}
                        onClick={() => onSelectVocab(result.topicPath, result.item)}
                        sx={{ borderRadius: 1, alignItems: 'flex-start' }}
                      >
                        <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                          <WordIcon size={18} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                              <Typography component="span" sx={{ fontWeight: 700 }}>
                                {result.field === 'word' ? (
                                  <HighlightedText
                                    value={result.item.word}
                                    range={getHighlightRange(
                                      result.item.word,
                                      normalizedLastQuery,
                                      normalizeForHighlight,
                                    )}
                                  />
                                ) : (
                                  result.item.word
                                )}
                              </Typography>
                              <Chip
                                size="small"
                                label={
                                  result.field === 'word'
                                    ? t('search.matchWord')
                                    : t('search.matchMeaning')
                                }
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box component="span" sx={{ display: 'block', minWidth: 0 }}>
                              <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                                {result.field === 'meaning' ? (
                                  <HighlightedText
                                    value={result.item.vnMeaning}
                                    range={getHighlightRange(
                                      matchedValue,
                                      normalizedLastQuery,
                                      normalizeForHighlight,
                                    )}
                                  />
                                ) : (
                                  result.item.vnMeaning
                                )}
                              </Typography>
                              <Typography component="span" variant="caption" color="text.disabled" noWrap sx={{ display: 'block' }}>
                                {t('search.inTopic', {
                                  topic: breadcrumbOf([...result.topicPath]) || scopeLabel,
                                })}
                              </Typography>
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'span' }}
                        />
                      </ListItemButton>
                    );
                  })}
                </ResultSection>
              )}

              {searching && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 2 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="text.secondary">
                    {t('search.searching')}
                  </Typography>
                </Box>
              )}
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

/** Compact icon toggle (VSCode-find-bar style) with a descriptive tooltip. */
const IconToggle: React.FC<{
  value: string;
  title: string;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ value, title, selected, disabled = false, onToggle, children }) => (
  <Tooltip title={title}>
    {/* span keeps the tooltip working while the button is disabled */}
    <span>
      <ToggleButton
        value={value}
        size="small"
        selected={selected}
        disabled={disabled}
        onChange={onToggle}
        aria-label={title}
        sx={{
          width: 34,
          height: 34,
          p: 0,
          borderRadius: 1,
          lineHeight: 1,
        }}
      >
        {children}
      </ToggleButton>
    </span>
  </Tooltip>
);

const ResultPlaceholder: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <Box
    sx={{
      height: '100%',
      minHeight: 200,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      color: 'text.disabled',
      gap: 1.5,
      px: 3,
    }}
  >
    {icon}
    <Typography variant="body2" color="text.secondary">
      {text}
    </Typography>
  </Box>
);

const ResultSection: React.FC<{
  title: string;
  note?: string;
  children: React.ReactNode;
}> = ({ title, note, children }) => (
  <Box sx={{ mb: 1.5 }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 1,
        px: 1,
        py: 0.5,
        position: 'sticky',
        top: 0,
        zIndex: 1,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
        {title}
      </Typography>
      {note && (
        <Typography variant="caption" color="text.disabled">
          {note}
        </Typography>
      )}
    </Box>
    <List disablePadding>{children}</List>
  </Box>
);

SearchDialog.displayName = 'SearchDialog';
