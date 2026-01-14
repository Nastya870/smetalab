import { useState } from 'react';
import PropTypes from 'prop-types';
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

import { estimateColors as colors } from 'shared/ui/themes/estimateStyle';

/**
 * Универсальный диалог импорта из CSV (серверный импорт)
 */
const ImportDialog = ({
    open,
    onClose,
    onImport,
    onDownloadTemplate,
    onSuccess,
    title = 'Импорт данных из CSV',
    description,
    isGlobal = false
}) => {
    const [file, setFile] = useState(null);
    const [mode, setMode] = useState('add'); // 'add' | 'replace'
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(null); // { current, total }

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.csv')) {
                setError('Пожалуйста, выберите CSV файл');
                return;
            }
            setFile(selectedFile);
            setError(null);
            setResult(null);
            setProgress(null);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            await onDownloadTemplate();
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
        setProgress(null);

        try {
            const importResult = await onImport(file, { mode, isGlobal }, setProgress);
            const resultData = importResult?.data || importResult;
            setResult(resultData);

            // Если есть success: true или нет errorCount (или errorCount === 0), считаем успехом
            const hasNoErrors = resultData?.errorCount === undefined || resultData?.errorCount === 0 || resultData?.errorCount === null;
            const isSuccess = resultData?.success === true || (hasNoErrors && resultData?.successCount > 0);

            console.log('[ImportDialog] Result:', { resultData, isSuccess, hasNoErrors });

            if (isSuccess) {
                if (onSuccess) {
                    // Даем 500мс, чтобы пользователь увидел финальный статус (зеленую плашку)
                    setTimeout(() => {
                        onSuccess();
                        handleClose();
                    }, 500);
                }
            }
        } catch (err) {
            console.error('Import error:', err);
            setError(err.response?.data?.message || err.message || 'Ошибка при импорте файла');
            setResult(err.response?.data);
        } finally {
            setLoading(false);
            setProgress(null);
        }
    };

    const handleClose = () => {
        if (loading) return;
        setFile(null);
        setMode('add');
        setResult(null);
        setError(null);
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    overflow: 'hidden'
                }
            }}
        >
            <DialogTitle sx={{ p: 3, bgcolor: '#fff', borderBottom: `1px solid ${colors.border}` }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{
                        p: 1,
                        borderRadius: '10px',
                        bgcolor: colors.primaryLight,
                        display: 'flex',
                        color: colors.primary
                    }}>
                        <IconFileUpload size={24} />
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: colors.textPrimary }}>
                        {title}
                    </Typography>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ p: 3, pt: '24px !important' }}>
                <Stack spacing={3}>
                    {/* Описание */}
                    <Box sx={{
                        p: 2,
                        borderRadius: '12px',
                        bgcolor: colors.primaryLight,
                        border: `1px solid ${colors.primary}20`,
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <Box sx={{ position: 'absolute', right: -10, top: -10, opacity: 0.05, color: colors.primary }}>
                            <IconFileUpload size={80} />
                        </Box>
                        <Stack direction="row" spacing={2}>
                            <IconAlertCircle size={20} color={colors.primary} style={{ marginTop: 2 }} />
                            <Stack spacing={1}>
                                <Typography variant="body2" sx={{ color: colors.textPrimary, fontWeight: 500, lineHeight: 1.6 }}>
                                    {description || 'Загрузите CSV файл для импорта. Файл можно редактировать в Excel или любом текстовом редакторе.'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: colors.textSecondary, fontStyle: 'italic' }}>
                                    💡 Совет: Скачайте шаблон, заполните его в Excel и загрузите обратно. Используйте точку с запятой (;) как разделитель.
                                </Typography>
                            </Stack>
                        </Stack>
                    </Box>

                    {/* Кнопка скачивания шаблона */}
                    {onDownloadTemplate && (
                        <Button
                            variant="outlined"
                            startIcon={<IconDownload size={18} />}
                            onClick={handleDownloadTemplate}
                            fullWidth
                            sx={{
                                borderRadius: '10px',
                                py: 1.2,
                                textTransform: 'none',
                                fontWeight: 600,
                                borderColor: colors.border,
                                color: colors.textSecondary,
                                '&:hover': {
                                    borderColor: colors.primary,
                                    bgcolor: colors.primaryLight,
                                    color: colors.primary
                                }
                            }}
                        >
                            Скачать шаблон CSV
                        </Button>
                    )}

                    {/* Режим импорта */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: colors.textPrimary }}>
                            Режим импорта
                        </Typography>
                        <RadioGroup value={mode} onChange={(e) => setMode(e.target.value)}>
                            <Stack spacing={1}>
                                <FormControlLabel
                                    value="add"
                                    control={<Radio size="small" sx={{ color: colors.primary, '&.Mui-checked': { color: colors.primary } }} />}
                                    sx={{
                                        m: 0,
                                        p: 1.5,
                                        borderRadius: '10px',
                                        border: `1px solid ${mode === 'add' ? colors.primary : colors.border}`,
                                        bgcolor: mode === 'add' ? colors.primaryLight : 'transparent',
                                        transition: 'all 0.2s',
                                        '&:hover': { bgcolor: colors.primaryLight }
                                    }}
                                    label={
                                        <Box sx={{ ml: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: colors.textPrimary }}>Добавить к существующим</Typography>
                                            <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block' }}>
                                                Новые данные будут добавлены к текущим.
                                            </Typography>
                                        </Box>
                                    }
                                />
                                <FormControlLabel
                                    value="replace"
                                    control={<Radio size="small" sx={{ color: colors.primary, '&.Mui-checked': { color: colors.primary } }} />}
                                    sx={{
                                        m: 0,
                                        p: 1.5,
                                        borderRadius: '10px',
                                        border: `1px solid ${mode === 'replace' ? colors.primary : colors.border}`,
                                        bgcolor: mode === 'replace' ? colors.primaryLight : 'transparent',
                                        transition: 'all 0.2s',
                                        '&:hover': { bgcolor: colors.primaryLight }
                                    }}
                                    label={
                                        <Box sx={{ ml: 1 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, color: colors.textPrimary }}>Обновить существующие</Typography>
                                            <Typography variant="caption" sx={{ color: colors.textSecondary, display: 'block' }}>
                                                Обновит цены и данные для существующих позиций по артикулу (SKU).
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </Stack>
                        </RadioGroup>
                    </Box>

                    {/* Информация о типе */}
                    {isGlobal && (
                        <Alert
                            severity="warning"
                            sx={{ borderRadius: '10px', bgcolor: colors.warningLight, color: '#92400E', border: '1px solid #FCD34D' }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                ⚠️ Вы импортируете <b>глобальные</b> данные. Они будут доступны всем пользователям.
                            </Typography>
                        </Alert>
                    )}

                    {/* Выбор файла */}
                    <Box>
                        <Button
                            variant="contained"
                            component="label"
                            fullWidth
                            sx={{
                                borderRadius: '12px',
                                py: 2,
                                bgcolor: file ? colors.green : colors.primary,
                                boxShadow: file ? '0 4px 12px rgba(16, 185, 129, 0.2)' : '0 4px 12px rgba(79, 70, 229, 0.2)',
                                textTransform: 'none',
                                fontWeight: 700,
                                fontSize: '1rem',
                                '&:hover': {
                                    bgcolor: file ? colors.greenDark : colors.primaryDark,
                                }
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                                {file ? <IconCheck size={22} /> : <IconFileUpload size={22} />}
                                <Typography variant="inherit">
                                    {file ? file.name : 'Выбрать CSV файл'}
                                </Typography>
                            </Stack>
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
                        <Box sx={{ textAlign: 'center', py: 1 }}>
                            <LinearProgress
                                variant={progress ? "determinate" : "indeterminate"}
                                value={progress ? Math.round((progress.current / progress.total) * 100) : 0}
                                sx={{ borderRadius: '4px', height: 6, bgcolor: colors.primaryLight, '& .MuiLinearProgress-bar': { bgcolor: colors.primary } }}
                            />
                            <Typography variant="caption" sx={{ mt: 1.5, display: 'block', fontWeight: 600, color: colors.primary }}>
                                {progress
                                    ? `Импортировано ${progress.current} из ${progress.total} (${Math.round((progress.current / progress.total) * 100)}%)`
                                    : 'Импортируем данные, пожалуйста подождите...'
                                }
                            </Typography>
                        </Box>
                    )}

                    {/* Ошибка */}
                    {error && (
                        <Alert
                            severity="error"
                            icon={<IconAlertCircle size={20} />}
                            sx={{ borderRadius: '10px', bgcolor: colors.errorLight, color: colors.error, border: `1px solid ${colors.error}30` }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{error}</Typography>
                        </Alert>
                    )}

                    {/* Результат импорта */}
                    {result && (
                        <Box sx={{
                            p: 2,
                            borderRadius: '12px',
                            bgcolor: (result.success || result.errorCount === 0 || result.errorCount === undefined) ? colors.greenLight : colors.warningLight,
                            border: `1px solid ${(result.success || result.errorCount === 0 || result.errorCount === undefined) ? colors.green : colors.warning}30`
                        }}>
                            {(result.success || result.errorCount === 0 || result.errorCount === undefined) ? (
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <IconCheck size={24} color={colors.greenDark} />
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: colors.greenDark }}>
                                        Успешно импортировано: {result.successCount || 0} записей
                                    </Typography>
                                </Stack>
                            ) : (
                                <Stack spacing={1}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#92400E' }}>
                                        Импортировано: {result.successCount}, Ошибок: {result.errorCount}
                                    </Typography>
                                    {result.errors && result.errors.length > 0 && (
                                        <Box sx={{ maxHeight: 120, overflowY: 'auto', mt: 1 }}>
                                            {result.errors.slice(0, 5).map((err, index) => (
                                                <Typography key={index} variant="caption" sx={{ display: 'block', color: '#B45309', py: 0.5 }}>
                                                    • Строка {err.row || err.line || '?'}: {err.error || err.message}
                                                </Typography>
                                            ))}
                                            {result.errors.length > 5 && (
                                                <Typography variant="caption" sx={{ color: colors.textSecondary, mt: 0.5, display: 'block' }}>
                                                    ... и еще {result.errors.length - 5} ошибок
                                                </Typography>
                                            )}
                                        </Box>
                                    )}
                                </Stack>
                            )}
                        </Box>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 3, bgcolor: colors.cardBg, borderTop: `1px solid ${colors.border}` }}>
                <Button
                    onClick={handleClose}
                    disabled={loading}
                    sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        color: colors.textSecondary,
                        px: 3,
                        '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' }
                    }}
                >
                    Отмена
                </Button>
                <Button
                    onClick={handleImport}
                    variant="contained"
                    disabled={!file || loading}
                    sx={{
                        borderRadius: '10px',
                        px: 4,
                        py: 1,
                        textTransform: 'none',
                        fontWeight: 700,
                        bgcolor: colors.primary,
                        '&:hover': { bgcolor: colors.primaryDark },
                        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
                    }}
                >
                    {loading ? 'Импорт...' : 'Импортировать'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

ImportDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onImport: PropTypes.func.isRequired,
    onDownloadTemplate: PropTypes.func,
    onSuccess: PropTypes.func,
    title: PropTypes.string,
    description: PropTypes.string,
    isGlobal: PropTypes.bool
};

export default ImportDialog;
