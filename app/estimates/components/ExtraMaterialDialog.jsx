import React from 'react';
import PropTypes from 'prop-types';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    Box,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Autocomplete,
    Avatar
} from '@mui/material';
import { IconPlus, IconSearch, IconPhoto } from '@tabler/icons-react';
import { formatCurrency } from 'shared/lib/formatters';
import { estimateColors as colors } from 'shared/ui/themes/estimateStyle';

const ExtraMaterialDialog = ({
    open,
    onClose,
    materials,
    loadingMaterials,
    form,
    setForm,
    submitting,
    onSubmit,
    error
}) => {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: '12px',
                    boxShadow: '0 8px 28px rgba(0,0,0,0.12)'
                }
            }}
        >
            <DialogTitle sx={{ px: 4, pt: 3.5, pb: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#1F2937' }}>
                    Добавить материал (отдельный чек)
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ px: 4, pb: 3 }}>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    <Box
                        sx={{
                            p: 2,
                            bgcolor: 'rgba(79, 70, 229, 0.06)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.5
                        }}
                    >
                        <Box sx={{ color: colors.primary, mt: 0.25 }}>💡</Box>
                        <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#374151' }}>
                                Отдельный чек
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.25 }}>
                                Материал не учтён в смете. Оплачивается клиентом отдельно.
                            </Typography>
                        </Box>
                    </Box>

                    {loadingMaterials ? (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <CircularProgress sx={{ color: colors.primary }} size={32} />
                            <Typography variant="body2" sx={{ color: colors.textSecondary, mt: 2 }}>
                                Загрузка материалов...
                            </Typography>
                        </Box>
                    ) : (
                        <Autocomplete
                            options={materials}
                            getOptionLabel={(option) => option.name}
                            value={form.material}
                            onChange={(e, newValue) => {
                                setForm({
                                    ...form,
                                    material: newValue,
                                    purchasePrice: newValue?.price?.toString() || ''
                                });
                            }}
                            filterOptions={(options, { inputValue }) => {
                                if (!inputValue) return options.slice(0, 100);
                                const searchLower = inputValue.toLowerCase();
                                return options.filter(option =>
                                    option.name.toLowerCase().includes(searchLower) ||
                                    (option.sku && option.sku.toLowerCase().includes(searchLower)) ||
                                    (option.category && option.category.toLowerCase().includes(searchLower))
                                ).slice(0, 100);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    placeholder="Поиск по названию, артикулу или категории..."
                                    required
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: (
                                            <>
                                                <Box sx={{ color: colors.primary, display: 'flex', ml: 0.5, mr: 1 }}>
                                                    <IconSearch size={20} />
                                                </Box>
                                                {params.InputProps.startAdornment}
                                            </>
                                        ),
                                        sx: {
                                            height: 48,
                                            borderRadius: '10px',
                                            bgcolor: '#fff',
                                            '& fieldset': { borderColor: '#D8DFE8' },
                                            '&:hover fieldset': { borderColor: '#B0BAC9 !important' },
                                            '&.Mui-focused fieldset': { borderColor: `${colors.primary} !important`, borderWidth: '2px' }
                                        }
                                    }}
                                    sx={{ '& .MuiInputBase-input::placeholder': { color: '#9CA3AF', opacity: 1 } }}
                                    helperText={
                                        <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                                            Доступно материалов: {materials.length}
                                        </Typography>
                                    }
                                />
                            )}
                            renderOption={(props, option) => (
                                <li {...props} key={option.id}>
                                    <Stack direction="row" spacing={2} alignItems="center" width="100%">
                                        {option.image ? (
                                            <Avatar src={option.image} alt={option.name} variant="rounded" sx={{ width: 44, height: 44, border: '1px solid #E5E7EB' }} />
                                        ) : (
                                            <Avatar variant="rounded" sx={{ width: 44, height: 44, bgcolor: '#F3F4F6' }}>
                                                <IconPhoto size={18} color="#9CA3AF" />
                                            </Avatar>
                                        )}
                                        <Box flex={1}>
                                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>{option.name}</Typography>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Typography variant="caption" sx={{ color: '#9CA3AF' }}>{option.sku || 'Без артикула'}</Typography>
                                                <Typography variant="caption" sx={{ color: '#D1D5DB' }}>•</Typography>
                                                <Typography variant="caption" sx={{ color: '#9CA3AF' }}>{option.category}</Typography>
                                                <Typography variant="caption" sx={{ color: '#D1D5DB' }}>•</Typography>
                                                <Typography variant="caption" sx={{ color: colors.primary, fontWeight: 600 }}>
                                                    {formatCurrency(option.price)} / {option.unit}
                                                </Typography>
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </li>
                            )}
                            noOptionsText="Материалы не найдены"
                            loading={loadingMaterials}
                            disabled={loadingMaterials}
                        />
                    )}

                    {form.material && (
                        <>
                            <Box sx={{ p: 2, bgcolor: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB' }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    {form.material.image ? (
                                        <Avatar src={form.material.image} alt={form.material.name} variant="rounded" sx={{ width: 56, height: 56, border: '1px solid #E5E7EB' }} />
                                    ) : (
                                        <Avatar variant="rounded" sx={{ width: 56, height: 56, bgcolor: '#F3F4F6' }}>
                                            <IconPhoto size={22} color="#9CA3AF" />
                                        </Avatar>
                                    )}
                                    <Box flex={1}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1F2937' }}>{form.material.name}</Typography>
                                        <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap" useFlexGap>
                                            <Typography variant="caption" sx={{ color: '#6B7280', bgcolor: '#F3F4F6', px: 1, py: 0.25, borderRadius: '4px' }}>
                                                {form.material.sku || 'Без артикула'}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: colors.primary, bgcolor: colors.primaryLight, px: 1, py: 0.25, borderRadius: '4px' }}>
                                                {form.material.category}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: colors.green, bgcolor: colors.greenLight, px: 1, py: 0.25, borderRadius: '4px', fontWeight: 600 }}>
                                                {formatCurrency(form.material.price)} / {form.material.unit}
                                            </Typography>
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Box>

                            <TextField
                                label="Количество"
                                type="number"
                                fullWidth
                                value={form.quantity}
                                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                                inputProps={{ min: 0, step: 0.01 }}
                                helperText={<Typography variant="caption" sx={{ color: '#9CA3AF' }}>Единица измерения: {form.material.unit}</Typography>}
                                required
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                            />

                            <TextField
                                label="Фактическая цена закупки"
                                type="number"
                                fullWidth
                                value={form.purchasePrice}
                                onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                                inputProps={{ min: 0, step: 0.01 }}
                                helperText={<Typography variant="caption" sx={{ color: '#9CA3AF' }}>Базовая цена: {formatCurrency(form.material.price)} за {form.material.unit}</Typography>}
                                required
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                            />

                            {form.quantity && form.purchasePrice && (
                                <Box sx={{ p: 2, bgcolor: colors.greenLight, borderRadius: '10px', border: `1px solid ${colors.green}` }}>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography variant="body2" sx={{ fontWeight: 500, color: colors.greenDark }}>Итоговая сумма:</Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: colors.green }}>
                                            {formatCurrency(parseFloat(form.quantity) * parseFloat(form.purchasePrice))}
                                        </Typography>
                                    </Stack>
                                </Box>
                            )}
                        </>
                    )}

                    {error && <Alert severity="error" sx={{ borderRadius: '10px' }}>{error}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 4, py: 2.5, gap: 1.5 }}>
                <Button onClick={onClose} disabled={submitting} sx={{ color: '#7B8794', textTransform: 'none' }}>Отмена</Button>
                <Button
                    variant="contained"
                    onClick={onSubmit}
                    disabled={submitting || !form.material || !form.quantity || !form.purchasePrice}
                    startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <IconPlus size={18} />}
                    sx={{
                        bgcolor: colors.primary,
                        fontWeight: 600,
                        textTransform: 'none',
                        px: 3,
                        borderRadius: '10px'
                    }}
                >
                    {submitting ? 'Добавление...' : 'Добавить материал'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

ExtraMaterialDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    materials: PropTypes.array.isRequired,
    loadingMaterials: PropTypes.bool.isRequired,
    form: PropTypes.object.isRequired,
    setForm: PropTypes.func.isRequired,
    submitting: PropTypes.bool.isRequired,
    onSubmit: PropTypes.func.isRequired,
    error: PropTypes.string
};

export default ExtraMaterialDialog;
