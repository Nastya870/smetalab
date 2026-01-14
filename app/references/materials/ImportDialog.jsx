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
  Chip,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { IconFileUpload, IconDownload, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import materialsImportExportAPI from 'api/materialsImportExport';

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
      await materialsImportExportAPI.downloadTemplate();
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
      delimiter: '', // Автоопределение разделителя (запятая или точка с запятой)
      complete: async (parseResult) => {
        try {
          const rows = parseResult.data;

          if (rows.length === 0) {
            setError('CSV файл пустой или не содержит данных');
            setLoading(false);
            return;
          }

          // ✅ Маппинг русских заголовков на английские поля
          const fieldMapping = {
            'Артикул': 'sku',
            'Наименование': 'name',
            'Категория': 'category',
            'Единица измерения': 'unit',
            'Ед. изм.': 'unit',
            'Цена': 'price',
            'Поставщик': 'supplier',
            'Вес (кг)': 'weight',
            'Вес': 'weight',
            'URL изображения': 'image',
            'Ссылка на изображение': 'image',
            'URL товара': 'productUrl',
            'Ссылка на товар': 'productUrl',
            'Ссылка': 'productUrl',
            'Показывать изображение': 'showImage'
          };

          // Валидация и преобразование данных
          const materials = [];
          const errors = [];

          rows.forEach((row, index) => {
            const lineNumber = index + 2; // +2 потому что 1 строка - заголовки

            // ✅ Преобразуем русские ключи в английские (если они есть)
            const normalizedRow = {};
            Object.keys(row).forEach(key => {
              const mappedKey = fieldMapping[key] || key;
              normalizedRow[mappedKey] = row[key];
            });

            // Проверка обязательных полей
            if (!normalizedRow.sku || !normalizedRow.name || !normalizedRow.unit || !normalizedRow.supplier || !normalizedRow.category) {
              errors.push({
                line: lineNumber,
                message: 'Отсутствуют обязательные поля: Артикул, Наименование, Единица измерения, Поставщик, Категория',
                data: row
              });
              return;
            }

            // Валидация цены
            const price = parseFloat(normalizedRow.price) || 0;
            if (price < 0) {
              errors.push({
                line: lineNumber,
                message: 'Цена не может быть отрицательной',
                data: row
              });
              return;
            }

            // Валидация веса
            const weight = parseFloat(normalizedRow.weight) || 0;
            if (weight < 0) {
              errors.push({
                line: lineNumber,
                message: 'Вес не может быть отрицательным',
                data: row
              });
              return;
            }

            const showImage = normalizedRow.showImage === 'да' ||
              normalizedRow.showImage === 'true' ||
              normalizedRow.showImage === true;

            materials.push({
              sku: normalizedRow.sku?.trim(),
              name: normalizedRow.name?.trim(),
              category: normalizedRow.category?.trim(),
              unit: normalizedRow.unit?.trim() || 'шт',
              price: price,
              supplier: normalizedRow.supplier?.trim(),
              weight: weight,
              image: normalizedRow.image?.trim() || '',
              productUrl: normalizedRow.productUrl?.trim() || '',
              showImage: showImage
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

          // 🔍 DEBUG: Логируем что отправляем
          // Отправляем данные на сервер
          const importResult = await materialsImportExportAPI.importMaterials(materials, {
            mode,
            isGlobal
          });
          // ✅ ВСЕГДА показываем результат
          // API возвращает { success, data: { successCount, errorCount, errors }, message }
          const resultData = importResult.data || importResult;
          if (resultData) {
            setResult(resultData);
          }

          // ✅ ВСЕГДА обновляем список (даже если есть ошибки)
          onSuccess(); // Обновляем список материалов

          // ✅ Автоматически закрываем модалку только если импорт полностью успешен
          if (resultData?.errorCount === 0 && resultData?.successCount > 0) {
            setTimeout(() => {
              handleClose();
            }, 2000); // Показываем успех 2 секунды, затем закрываем
          }
        } catch (err) {
          console.error('[IMPORT ERROR] Full error:', err);
          console.error('[IMPORT ERROR] Response:', err.response);
          console.error('[IMPORT ERROR] Response data:', err.response?.data);

          const errorMessage = err.response?.data?.message || err.message || 'Ошибка при импорте файла';
          setError(errorMessage);

          // Если сервер вернул детали (successCount, errorCount) - показываем их
          if (err.response?.data) {
            setResult(err.response.data);
          }
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        console.error('Parse error:', err);
        setError('Ошибка при чтении CSV файла');
        setLoading(false);
      }
    });
  };

  const handleClose = () => {
    setFile(null);
    setMode('add');
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconFileUpload />
          <Typography variant="h3">Импорт материалов из CSV</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Описание */}
          <Alert severity="info">
            <Stack spacing={1}>
              <Typography variant="body2">
                📄 Загрузите CSV файл с материалами для импорта. Файл можно редактировать в <b>Excel</b> или любом текстовом редакторе.
              </Typography>
              <Typography variant="body2">
                <b>Обязательные поля:</b> Артикул, Наименование, Категория, Единица измерения, Цена, Поставщик
              </Typography>
              <Typography variant="body2">
                <b>Дополнительные поля:</b> Вес (кг), URL изображения, URL товара, Показывать изображение (да/нет)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                💡 Совет: Скачайте шаблон, заполните его в Excel и загрузите обратно
              </Typography>
            </Stack>
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
                    <Typography variant="body1">Добавить/Обновить</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Добавить новые материалы и обновить существующие (по SKU)
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
                      Удалить существующие {isGlobal ? 'глобальные' : 'мои'} материалы и загрузить новые
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
                ⚠️ Вы импортируете <b>глобальные</b> материалы. Они будут доступны всем компаниям.
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
              <LinearProgress aria-label="Загрузка импорта материалов" />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Импортируем материалы...
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
              {(result.errorCount === 0 || result.errorCount === undefined) ? (
                <Alert severity="success" icon={<IconCheck />}>
                  <Typography variant="body1" fontWeight={600}>
                    ✅ Успешно импортировано: {result.successCount || 0} материалов
                  </Typography>
                  {result.message && (
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                      {result.message}
                    </Typography>
                  )}
                </Alert>
              ) : (
                <Alert severity="warning">
                  <Typography variant="body1" fontWeight={600}>
                    Импортировано: {result.successCount || 0}, Ошибок: {result.errorCount || 0}
                  </Typography>
                  {/* ✅ Показываем failedImports (не errors) */}
                  {result.failedImports && result.failedImports.length > 0 && (
                    <List dense sx={{ mt: 1 }}>
                      {result.failedImports.slice(0, 5).map((err, index) => (
                        <ListItem key={index} sx={{ px: 0 }}>
                          <ListItemText
                            primary={`${err.sku} (${err.name}): ${err.error}`}
                            primaryTypographyProps={{ variant: 'caption', color: 'error' }}
                          />
                        </ListItem>
                      ))}
                      {result.failedImports.length > 5 && (
                        <Typography variant="caption" color="text.secondary">
                          ... и еще {result.failedImports.length - 5} ошибок
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
        <Button onClick={handleClose} disabled={loading} size="small">
          Закрыть
        </Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={!file || loading}
          size="small"
        >
          Импортировать
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
