import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Typography,
    Box,
    IconButton,
    Chip,
    useTheme,
    InputAdornment
} from '@mui/material';
import {
    IconX,
    IconDeviceFloppy,
    IconCalendar,
    IconFileDescription,
    IconCategory,
    IconActivity,
    IconEdit,
    IconFileText
} from '@tabler/icons-react';

const ESTIMATE_TYPES = [
    'строительство',
    'реконструкция',
    'капремонт',
    'проектные работы',
    'другое'
];

const ESTIMATE_STATUSES = [
    { value: 'draft', label: 'Черновик', color: '#6B7280', bgcolor: '#F3F4F6' },
    { value: 'in_review', label: 'На проверке', color: '#D97706', bgcolor: '#FEF3C7' },
    { value: 'approved', label: 'Утверждена', color: '#059669', bgcolor: '#D1FAE5' },
    { value: 'rejected', label: 'Отклонена', color: '#DC2626', bgcolor: '#FEE2E2' },
    { value: 'completed', label: 'Завершена', color: '#4F46E5', bgcolor: '#EEF2FF' }
];

const EstimateMetadataForm = ({ open, onClose, metadata, onSave }) => {
    const theme = useTheme();

    const [formData, setFormData] = useState({
        name: '',
        status: 'draft',
        estimateType: 'строительство',
        description: '',
        estimateDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (open && metadata) {
            setFormData({
                name: metadata.name || '',
                status: metadata.status || 'draft',
                estimateType: metadata.estimateType || 'строительство',
                description: metadata.description || '',
                estimateDate: metadata.estimateDate ? new Date(metadata.estimateDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            });
        }
    }, [open, metadata]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        onSave(formData);
        onClose();
    };

    // Helper inputs style
    const inputSx = {
        '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            bgcolor: '#FAFAFA',
            transition: 'all 0.2s',
            '&:hover': {
                bgcolor: '#FFFFFF',
                borderColor: '#B0B8C4'
            },
            '&.Mui-focused': {
                bgcolor: '#FFFFFF',
                boxShadow: '0 0 0 4px rgba(99, 91, 255, 0.1)'
            }
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    overflow: 'hidden'
                }
            }}
        >
            {/* Header */}
            <Box sx={{
                px: 3,
                py: 2.5,
                borderBottom: '1px solid #F3F4F6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: '#FFFFFF'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '10px',
                        bgcolor: '#EEF2FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#635BFF'
                    }}>
                        <IconEdit size={24} stroke={1.5} />
                    </Box>
                    <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
                            Настройки сметы
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#6B7280' }}>
                            Основные параметры документа
                        </Typography>
                    </Box>
                </Box>
                <IconButton onClick={onClose} size="small" sx={{ color: '#9CA3AF' }}>
                    <IconX size={20} />
                </IconButton>
            </Box>

            <DialogContent sx={{ p: 3, bgcolor: '#FFFFFF' }}>
                <Grid container spacing={3}>

                    {/* Название */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1, ml: 0.5, fontWeight: 600, color: '#374151' }}>
                            Название сметы
                        </Typography>
                        <TextField
                            fullWidth
                            name="name"
                            placeholder="Например: Ремонт квартиры на Ленина 45"
                            value={formData.name}
                            onChange={handleChange}
                            sx={inputSx}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <IconFileText size={20} color="#9CA3AF" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>

                    {/* Тип и Дата (в одной строке) */}
                    <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" sx={{ mb: 1, ml: 0.5, fontWeight: 600, color: '#374151' }}>
                            Тип работ
                        </Typography>
                        <FormControl fullWidth sx={inputSx}>
                            <Select
                                name="estimateType"
                                value={formData.estimateType}
                                onChange={handleChange}
                                displayEmpty
                                startAdornment={
                                    <InputAdornment position="start" sx={{ ml: 1, mr: -0.5 }}>
                                        <IconCategory size={20} color="#9CA3AF" />
                                    </InputAdornment>
                                }
                            >
                                {ESTIMATE_TYPES.map(type => (
                                    <MenuItem key={type} value={type}>
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" sx={{ mb: 1, ml: 0.5, fontWeight: 600, color: '#374151' }}>
                            Дата документа
                        </Typography>
                        <TextField
                            fullWidth
                            type="date"
                            name="estimateDate"
                            value={formData.estimateDate}
                            onChange={handleChange}
                            sx={inputSx}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <IconCalendar size={20} color="#9CA3AF" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>

                    {/* Статус */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1, ml: 0.5, fontWeight: 600, color: '#374151' }}>
                            Текущий статус
                        </Typography>
                        <Grid container spacing={1.5}>
                            {ESTIMATE_STATUSES.map((status) => {
                                const isSelected = formData.status === status.value;
                                return (
                                    <Grid item key={status.value}>
                                        <Box
                                            onClick={() => setFormData(prev => ({ ...prev, status: status.value }))}
                                            sx={{
                                                px: 2,
                                                py: 1,
                                                borderRadius: '10px',
                                                cursor: 'pointer',
                                                border: '1px solid',
                                                borderColor: isSelected ? status.color : '#E5E7EB',
                                                bgcolor: isSelected ? status.bgcolor : '#FFFFFF',
                                                color: isSelected ? status.color : '#6B7280',
                                                fontWeight: isSelected ? 600 : 500,
                                                fontSize: '0.875rem',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                '&:hover': {
                                                    borderColor: status.color,
                                                    bgcolor: status.bgcolor,
                                                    opacity: isSelected ? 1 : 0.7
                                                }
                                            }}
                                        >
                                            <Box sx={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: '50%',
                                                bgcolor: status.color
                                            }} />
                                            {status.label}
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Grid>

                    {/* Описание */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle2" sx={{ mb: 1, ml: 0.5, fontWeight: 600, color: '#374151' }}>
                            Примечание
                        </Typography>
                        <TextField
                            fullWidth
                            name="description"
                            placeholder="Дополнительная информация о смете..."
                            value={formData.description}
                            onChange={handleChange}
                            multiline
                            rows={4}
                            sx={inputSx}
                        />
                    </Grid>
                </Grid>
            </DialogContent>

            {/* Footer */}
            <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid #F3F4F6', bgcolor: '#F9FAFB' }}>
                <Button
                    onClick={onClose}
                    sx={{
                        color: '#6B7280',
                        fontWeight: 500,
                        textTransform: 'none',
                        fontSize: '0.9375rem',
                        px: 2.5
                    }}
                >
                    Отмена
                </Button>
                <Button
                    onClick={handleSave}
                    variant="contained"
                    startIcon={<IconDeviceFloppy size={20} />}
                    sx={{
                        bgcolor: '#635BFF',
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 600,
                        fontSize: '0.9375rem',
                        px: 3,
                        py: 1,
                        boxShadow: '0 4px 12px rgba(99, 91, 255, 0.2)',
                        '&:hover': {
                            bgcolor: '#564EE6',
                            boxShadow: '0 6px 16px rgba(99, 91, 255, 0.3)'
                        }
                    }}
                >
                    Сохранить изменения
                </Button>
            </DialogActions>
        </Dialog>
    );
};

EstimateMetadataForm.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    metadata: PropTypes.object,
    onSave: PropTypes.func.isRequired
};

export default EstimateMetadataForm;
