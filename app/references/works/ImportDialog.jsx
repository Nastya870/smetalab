import { useState } from 'react';
import PropTypes from 'prop-types';
import Papa from 'papaparse';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormLabel,
  Stack,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { IconFileUpload, IconDownload, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import worksImportExportAPI from 'api/worksImportExport';

const ImportDialog = ({ open, onClose, onSuccess, isGlobal = false }) => {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('add'); // 'add' | 'replace'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // Проверка расширения файла
      if (!selectedFile.name.endsWith('.csv')) {
        setError('Пожалуйста, выберите CSV файл');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await worksImportExportAPI.downloadTemplate();
    } catch (err) {
      console.error('Download template error:', err);
      setError('Ошибка при скачивании шаблона');
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Пожалуйста, выберите файл');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    // Парсим CSV в браузере с помощью PapaParse
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parseResult) => {
        try {
          const rows = parseResult.data;
          
          if (rows.length === 0) {
            setError('CSV файл пустой или не содержит данных');
            setLoading(false);
            return;
          }

          // Валидация и преобразование данных
          const works = [];
          const errors = [];

          rows.forEach((row, index) => {
            const lineNumber = index + 2; // +2 потому что 1 строка - заголовки

            // Поддержка как русских, так и английских заголовков
            const code = row['Код'] || row['code'] || row['Code'];
            const name = row['Наименование'] || row['name'] || row['Name'];

            // Проверка обязательных полей
            if (!code || !name) {
              errors.push({
                line: lineNumber,
                message: 'Отсутствуют обязательные поля: код или наименование',
                data: row
              });
              return;
            }

            // Валидация базовой цены
            const basePrice = parseFloat(row['Базовая цена'] || row['basePrice'] || row['base_price']) || 0;
            if (basePrice < 0) {
              errors.push({
                line: lineNumber,
                message: 'Базовая цена не может быть отрицательной',
                data: row
              });
              return;
            }

            works.push({
              code: code?.trim(),
              name: name?.trim(),
              category: (row['Категория'] || row['category'] || '')?.trim(),
              unit: (row['Ед. изм.'] || row['unit'] || 'шт')?.trim(),
              basePrice: basePrice,
              phase: (row['Фаза'] || row['phase'])?.trim() || null,
              section: (row['Раздел'] || row['section'])?.trim() || null,
              subsection: (row['Подраздел'] || row['subsection'])?.trim() || null
            });
          });

          // Если есть ошибки валидации
          if (errors.length > 0) {
            setResult({
              message: 'Обнаружены ошибки в CSV файле',
              successCount: 0,
              errorCount: errors.length,
              errors: errors
            });
            setLoading(false);
            return;
          }

          // Отправляем данные на сервер
          const importResult = await worksImportExportAPI.importWorks(works, {
            mode,
            isGlobal
          });

          setResult(importResult);
          
          if (importResult.errorCount === 0) {
            // Успешный импорт
            setTimeout(() => {
              onSuccess();
              handleClose();
            }, 2000);
          }
        } catch (err) {
          console.error('Import error:', err);
          setError(err.response?.data?.message || err.message || 'Ошибка при импорте файла');
          setResult(err.response?.data);
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        console.error('CSV parse error:', err);
        setError('Ошибка при парсинге CSV файла: ' + err.message);
        setLoading(false);
      }
    });
  };

  const handleClose = () => {
    setFile(null);
    setMode('add');
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconFileUpload />
          <Typography variant="h3">Импорт работ из CSV</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Описание */}
          <Alert severity="info">
            <Typography variant="body2">
              Загрузите CSV файл с работами для импорта. Обязательные поля: <b>Код, Наименование</b>. 
              Дополнительные: Категория, Ед. изм., Базовая цена, Фаза, Раздел, Подраздел
            </Typography>
          </Alert>

          {/* Кнопка скачивания шаблона */}
          <Box>
            <Button
              variant="outlined"
              startIcon={<IconDownload />}
              onClick={handleDownloadTemplate}
              fullWidth
            >
              Скачать шаблон CSV
            </Button>
          </Box>

          {/* Режим импорта */}
          <Box>
            <FormLabel component="legend">Режим импорта</FormLabel>
            <RadioGroup value={mode} onChange={(e) => setMode(e.target.value)}>
              <FormControlLabel
                value="add"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Добавить к существующим</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Новые работы будут добавлены к текущим
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="replace"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body1">Заменить всё</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Удалить существующие {isGlobal ? 'глобальные' : 'мои'} работы и загрузить новые
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>

          {/* Информация о типе */}
          {isGlobal && (
            <Alert severity="warning">
              <Typography variant="body2">
                ⚠️ Вы импортируете <b>глобальные</b> работы. Они будут доступны всем компаниям.
              </Typography>
            </Alert>
          )}

          {/* Выбор файла */}
          <Box>
            <Button
              variant="contained"
              component="label"
              startIcon={<IconFileUpload />}
              fullWidth
            >
              {file ? file.name : 'Выбрать CSV файл'}
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={handleFileChange}
              />
            </Button>
          </Box>

          {/* Прогресс загрузки */}
          {loading && (
            <Box>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Импортируем работы...
              </Typography>
            </Box>
          )}

          {/* Ошибка */}
          {error && (
            <Alert severity="error" icon={<IconAlertCircle />}>
              {error}
            </Alert>
          )}

          {/* Результат импорта */}
          {result && (
            <Box>
              {result.errorCount === 0 ? (
                <Alert severity="success" icon={<IconCheck />}>
                  <Typography variant="body1" fontWeight={600}>
                    ✅ Успешно импортировано: {result.successCount} работ
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="warning">
                  <Typography variant="body1" fontWeight={600}>
                    Импортировано: {result.successCount}, Ошибок: {result.errorCount}
                  </Typography>
                  {result.errors && result.errors.length > 0 && (
                    <List dense sx={{ mt: 1 }}>
                      {result.errors.slice(0, 5).map((err, index) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                          <ListItemText
                            primary={`Строка ${err.row || err.line}: ${err.error || err.message}`}
                            primaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItem>
                      ))}
                      {result.errors.length > 5 && (
                        <Typography variant="caption" color="text.secondary">
                          ... и еще {result.errors.length - 5} ошибок
                        </Typography>
                      )}
                    </List>
                  )}
                </Alert>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Отмена
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!file || loading}
          startIcon={<IconFileUpload />}
        >
          {loading ? 'Импортируем...' : 'Импортировать'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

ImportDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  isGlobal: PropTypes.bool
};

export default ImportDialog;
