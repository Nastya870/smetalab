import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Stack,
  LinearProgress
} from '@mui/material';
import { IconUpload, IconPhotoScan, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import axiosInstance from 'shared/lib/axiosInstance';

/**
 * Тестовая страница для OCR накладных
 * URL: /app/test/ocr
 */
export default function OCRTestPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Проверка размера
    if (file.size > 10 * 1024 * 1024) {
      setError('Размер файла не должен превышать 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);

    // Создаём preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      console.log('📤 Отправка файла на распознавание...');
      const startTime = Date.now();

      const response = await axiosInstance.post('/purchases/analyze-receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Распознавание завершено за ${duration}ms`);

      setResult({ ...response.data, duration });
    } catch (err) {
      console.error('❌ Ошибка распознавания:', err);
      setError(err.response?.data?.message || err.message || 'Не удалось распознать накладную');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h3" gutterBottom>
        🤖 Тест OCR накладных (OpenAI Vision)
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Загрузите фото накладной для автоматического распознавания материалов
      </Typography>

      <Stack spacing={3} sx={{ mt: 3 }}>
        {/* Загрузка файла */}
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<IconUpload />}
                fullWidth
                sx={{ py: 2 }}
              >
                Выбрать изображение накладной
                <input
                  type="file"
                  hidden
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={handleFileSelect}
                />
              </Button>

              {selectedFile && (
                <Alert severity="info">
                  Выбран файл: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(1)} KB)
                </Alert>
              )}

              {preview && (
                <Box sx={{ textAlign: 'center' }}>
                  <img
                    src={preview}
                    alt="Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '400px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px'
                    }}
                  />
                </Box>
              )}

              {selectedFile && !loading && (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<IconPhotoScan />}
                  onClick={handleAnalyze}
                  fullWidth
                >
                  Распознать накладную
                </Button>
              )}

              {loading && (
                <Box>
                  <LinearProgress />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                    Обрабатываем накладную... (обычно 2-5 секунд)
                  </Typography>
                </Box>
              )}

              {error && <Alert severity="error">{error}</Alert>}
            </Stack>
          </CardContent>
        </Card>

        {/* Результат */}
        {result && (
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                ✅ Результат распознавания
              </Typography>

              <Stack spacing={1} sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>Время обработки:</strong> {result.duration}ms
                </Typography>
                <Typography variant="body2">
                  <strong>Тип документа:</strong>{' '}
                  <Chip
                    label={result.documentType === 'printed' ? '📄 Печатный' : '✍️ Рукописный'}
                    size="small"
                    color={result.documentType === 'printed' ? 'success' : 'warning'}
                  />
                </Typography>
                {result.supplier && (
                  <Typography variant="body2">
                    <strong>Поставщик:</strong> {result.supplier}
                  </Typography>
                )}
                {result.documentNumber && (
                  <Typography variant="body2">
                    <strong>Номер документа:</strong> {result.documentNumber}
                  </Typography>
                )}
              </Stack>

              {result.stats && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Распознано: <strong>{result.stats.total}</strong> позиций | Найдено в БД:{' '}
                  <strong>{result.stats.matched}</strong> | Не найдено: <strong>{result.stats.notMatched}</strong> |
                  Низкая уверенность: <strong>{result.stats.lowConfidence}</strong>
                </Alert>
              )}

              {result.documentType === 'handwritten' && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  ⚠️ Обнаружен рукописный текст. Точность распознавания может быть ниже. Рекомендуем внимательно проверить все
                  позиции.
                </Alert>
              )}

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Название (из накладной)</TableCell>
                    <TableCell>Сопоставлено с БД</TableCell>
                    <TableCell align="right">Кол-во</TableCell>
                    <TableCell>Ед.</TableCell>
                    <TableCell align="right">Цена</TableCell>
                    <TableCell align="right">Сумма</TableCell>
                    <TableCell>Уверенность</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.materials?.map((material, index) => (
                    <TableRow
                      key={index}
                      sx={{
                        bgcolor:
                          material.confidence < 0.7
                            ? 'rgba(255, 152, 0, 0.08)'
                            : material.material_id
                            ? 'rgba(76, 175, 80, 0.08)'
                            : 'transparent'
                      }}
                    >
                      <TableCell>{material.name}</TableCell>
                      <TableCell>
                        {material.material_id ? (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <IconCheck size={16} color="green" />
                            <Typography variant="body2">{material.matched_name}</Typography>
                          </Stack>
                        ) : (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <IconAlertTriangle size={16} color="orange" />
                            <Typography variant="body2" color="text.secondary">
                              Не найдено в БД
                            </Typography>
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell align="right">{material.quantity}</TableCell>
                      <TableCell>{material.unit}</TableCell>
                      <TableCell align="right">{material.price?.toFixed(2)}₽</TableCell>
                      <TableCell align="right">
                        <strong>{material.total?.toFixed(2)}₽</strong>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${(material.confidence * 100).toFixed(0)}%`}
                          size="small"
                          color={material.confidence >= 0.9 ? 'success' : material.confidence >= 0.7 ? 'warning' : 'error'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
