import React, { useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { VocabItem } from '../../types';
import { WORD_TYPES } from '../../constants/wordTypes';

interface VocabFormDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  data: VocabItem;
  onChange?: (data: VocabItem) => void; // Optional - only for compatibility
  onClose: () => void;
  onSave: (data: VocabItem) => void; // Receives data as parameter
}

type SuggestOption = {
  label: string;       // từ gốc hiển thị (VI hoặc EN)
  viMeaning: string;   // nghĩa tiếng Việt để fill input
  enWord?: string;     // từ tiếng Anh suy ra (nếu có)
  type?: string;
};

export const VocabFormDialog: React.FC<VocabFormDialogProps> = React.memo(
  ({ open, mode, data, onChange, onClose, onSave }) => {
    const { t } = useTranslation(['vocabulary', 'common']);
    const [localData, setLocalData] = React.useState<VocabItem>(data);
    const [suggestions, setSuggestions] = React.useState<SuggestOption[]>([]);
    const [loadingSuggest, setLoadingSuggest] = React.useState(false);

    const [inputLang, setInputLang] = React.useState<'en' | 'vi'>('en');
    const [searchTerm, setSearchTerm] = React.useState(data.word || '');

    // Sync khi mở dialog / đổi item
    React.useEffect(() => {
      setLocalData(data);
      setSearchTerm(data.word || '');
    }, [data]);

    const handleWordChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        // luôn dùng cho autocomplete
        setSearchTerm(newValue);
        // chỉ cập nhật "Từ vựng" khi đang ở chế độ EN
        setLocalData((prev) =>
          inputLang === 'en' ? { ...prev, word: newValue } : prev,
        );
      },
      [inputLang],
    );

    const handleVnMeaningChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalData((prev) => ({ ...prev, vnMeaning: newValue }));
    }, []);

    const handleTypeChange = useCallback((e: { target: { value: unknown } }) => {
      const newValue = e.target.value as string;
      setLocalData((prev) => ({ ...prev, type: newValue }));
    }, []);

    const handlePronunciationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalData((prev) => ({ ...prev, pronunciation: newValue }));
    }, []);

    const handleSave = useCallback(() => {
      onSave(localData);
    }, [localData, onSave]);

    const handleClose = useCallback(() => {
      onClose();
    }, [onClose]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && localData.word.trim()) {
          handleSave();
        }
      },
      [localData.word, handleSave],
    );

    const isSaveDisabled = useMemo(() => !localData.word.trim(), [localData.word]);

    const handleLangChange = useCallback(
      (_: React.MouseEvent<HTMLElement>, value: 'en' | 'vi' | null) => {
        if (!value) return;
        setInputLang(value);
        setSuggestions([]);
      },
      [],
    );

    // Gọi API Laban autocomplete theo searchTerm + inputLang
    React.useEffect(() => {
      const term = searchTerm.trim();
      if (!term || term.length < 2) {
        setSuggestions([]);
        return;
      }

      const controller = new AbortController();
      const timer = setTimeout(async () => {
        try {
          setLoadingSuggest(true);
          const apiType = inputLang === 'en' ? 1 : 2;
          const baseUrl = `https://dict.laban.vn/ajax/autocomplete?type=${apiType}&site=dictionary&query=${encodeURIComponent(
            term,
          )}`;

          // Bypass CORS ở môi trường production – chỉ áp dụng cho API này
          const isProd = process.env.NODE_ENV === 'production';
          let res: Response | null = null;

          if (isProd) {
            const proxyUrls = [
              // allorigins – trả về nội dung raw
              `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`,
              // proxy phụ: cors.isomorphic-git – dạng ghép URL thẳng
              `https://cors.isomorphic-git.org/${baseUrl}`,
            ];

            for (const proxyUrl of proxyUrls) {
              try {
                const r = await fetch(proxyUrl, { signal: controller.signal });
                if (r.ok) {
                  res = r;
                  break;
                }
              } catch {
                // thử tiếp proxy khác
              }
            }

            if (!res) {
              throw new Error('All proxies for Laban autocomplete failed');
            }
          } else {
            res = await fetch(baseUrl, { signal: controller.signal, mode: 'cors' });
          }
          if (!res.ok) throw new Error(`Suggest failed ${res.status}`);
          const json = await res.json();

          const parsed: SuggestOption[] =
            json?.suggestions?.map((s: any) => {
              const html = String(s.data || '');
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              const pText = doc.querySelector('p')?.textContent?.trim() || '';

              const typeNode = doc.querySelector('.fr');
              const typeText = typeNode?.textContent?.trim() || '';
              const type = typeText.toLowerCase() || undefined;

              if (inputLang === 'en') {
                // type=1 (EN->VI): select = EN, <p> = nghĩa VI
                const enWord = s.select || '';
                const viMeaning = pText || '';
                return {
                  label: enWord,
                  enWord,
                  viMeaning,
                  type,
                };
              }

              // type=2 (VI->EN): select = VI, <p> = EN (vd: "noun: buffalo")
              const viWord = s.select || '';
              let enWord = '';
              if (pText) {
                const parts = pText.split(':');
                enWord = (parts[parts.length - 1] || '').trim();
              }

              return {
                label: viWord,
                enWord: enWord || undefined,
                // nghĩa tiếng Việt để fill luôn là từ gốc VI
                viMeaning: viWord,
                type,
              };
            }) || [];

          setSuggestions(parsed);
        } catch {
          if (!controller.signal.aborted) {
            setSuggestions([]);
          }
        } finally {
          if (!controller.signal.aborted) {
            setLoadingSuggest(false);
          }
        }
      }, 250);

      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    }, [searchTerm, inputLang]);

    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {mode === 'add' ? t('dialogs.vocabForm.titleAdd') : t('dialogs.vocabForm.titleEdit')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {/* Ngôn ngữ gợi ý + autocomplete */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {t('common:labels.type')}
                </Typography>
                <ToggleButtonGroup
                  value={inputLang}
                  exclusive
                  onChange={handleLangChange}
                  size="small"
                >
                  <ToggleButton value="en">EN</ToggleButton>
                  <ToggleButton value="vi">VI</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Autocomplete
                freeSolo
                loading={loadingSuggest}
                options={suggestions}
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.label || ''
                }
                inputValue={searchTerm}
                onInputChange={(_, value) => {
                  setSearchTerm(value);
                  if (inputLang === 'en') {
                    setLocalData((prev) => ({ ...prev, word: value }));
                  }
                }}
                onChange={(_, value) => {
                  if (!value) return;

                  // Người dùng gõ text tự do
                  if (typeof value === 'string') {
                    setSearchTerm(value);
                    if (inputLang === 'en') {
                      setLocalData((prev) => ({ ...prev, word: value }));
                    }
                    return;
                  }

                  const option = value as SuggestOption;

                  setLocalData((prev) => {
                    // luôn cố gắng suy ra EN, không bao giờ fallback sang VI trong chế độ VI
                    const enWord =
                      option.enWord ||
                      (inputLang === 'en' ? option.label || prev.word : prev.word);

                    // nghĩa tiếng Việt:
                    // - EN mode: dùng viMeaning (từ <p>)
                    // - VI mode: dùng label (VI gốc)
                    const vnFromSuggest =
                      inputLang === 'vi'
                        ? option.label || prev.vnMeaning
                        : option.viMeaning || prev.vnMeaning;

                    setSearchTerm(
                      inputLang === 'en' ? enWord : option.label || enWord,
                    );

                    return {
                      ...prev,
                      word: enWord || prev.word,
                      vnMeaning: vnFromSuggest,
                      type: option.type || prev.type,
                    };
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    autoFocus
                    fullWidth
                    label={`${t('dialogs.vocabForm.word')} *`}
                    placeholder={t('dialogs.vocabForm.wordPlaceholder')}
                    onChange={handleWordChange}
                    onKeyDown={handleKeyDown}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingSuggest ? (
                            <CircularProgress color="inherit" size={16} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const opt = option as SuggestOption | string;
                  const label = typeof opt === 'string' ? opt : opt.label || '';
                  let secondary = '';
                  if (typeof opt !== 'string') {
                    secondary =
                      inputLang === 'vi'
                        ? opt.enWord || ''
                        : opt.viMeaning || '';
                  }

                  return (
                    <li {...props}>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2" fontWeight={600}>
                          {label}
                        </Typography>
                        {secondary && (
                          <Typography variant="caption" color="text.secondary">
                            {secondary}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  );
                }}
              />
            </Box>

            <TextField
              fullWidth
              label={t('dialogs.vocabForm.meaning')}
              placeholder={t('dialogs.vocabForm.meaningPlaceholder')}
              value={localData.vnMeaning}
              onChange={handleVnMeaningChange}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>{t('dialogs.vocabForm.type')}</InputLabel>
                <Select
                  value={localData.type}
                  label={t('dialogs.vocabForm.type')}
                  onChange={handleTypeChange}
                >
                  <MenuItem value="">
                    <em>{t('dialogs.vocabForm.typePlaceholder')}</em>
                  </MenuItem>
                  {WORD_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>{t('dialogs.vocabForm.typePlaceholder')}</FormHelperText>
              </FormControl>
              <TextField
                fullWidth
                label={t('dialogs.vocabForm.pronunciation')}
                value={localData.pronunciation}
                onChange={handlePronunciationChange}
                placeholder={t('dialogs.vocabForm.pronunciationPlaceholder')}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{t('common:buttons.cancel')}</Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaveDisabled}>
            {mode === 'add' ? t('common:buttons.add') : t('common:buttons.save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

VocabFormDialog.displayName = 'VocabFormDialog';
