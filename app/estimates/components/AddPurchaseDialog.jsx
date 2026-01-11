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
    Chip
} from '@mui/material';
import { IconShoppingCartPlus } from '@tabler/icons-react';
import { formatCurrency } from 'shared/lib/formatters';

const AddPurchaseDialog = ({
    open,
    onClose,
    material,
    form,
    setForm,
    submitting,
    onSubmit,
    error
}) => {
    if (!material) return null;

    const remainder = material.quantity - (material.purchasedQuantity || 0);
    const isOverspent = remainder < 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Stack direction="row" alignItems="center" spacing={1}>
                    {material.isExtraCharge && (
                        <Chip label="О/Ч" color="warning" size="small" />
                    )}
                    <Typography variant="h6">Добавить в общие закупки</Typography>
                </Stack>
            </DialogTitle>
            <DialogContent>
                <Stack spacing={3} sx={{ mt: 2 }}>
                    {material.isExtraCharge && (
                        <Alert severity="warning" icon={<Chip label="О/Ч" color="warning" size="small" />}>
                            <strong>Отдельный чек</strong> — материал не учтен в смете. Клиент доплачивает отдельно.
                        </Alert>
                    )}

                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Материал
                        </Typography>
                        <Typography variant="body1" fontWeight={500}>
                            {material.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Артикул: {material.sku || '-'}
                        </Typography>
                    </Box>

                    <Box sx={{ p: 2, bgcolor: 'info.lighter', borderRadius: 1 }}>
                        <Stack direction="row" spacing={3} justifyContent="space-around">
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Нужно всего
                                </Typography>
                                <Typography variant="h6" fontWeight={600}>
                                    {material.quantity.toLocaleString('ru-RU')} {material.unit}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    Уже закуплено
                                </Typography>
                                <Typography variant="h6" fontWeight={600} color="info.main">
                                    {(material.purchasedQuantity || 0).toLocaleString('ru-RU')} {material.unit}
                                </Typography>
                            </Box>
                            <Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        {isOverspent ? 'Перерасход' : 'Осталось закупить'}
                                    </Typography>
                                    <Typography
                                        variant="h6"
                                        fontWeight={600}
                                        color={isOverspent ? 'error.main' : 'warning.main'}
                                    >
                                        {isOverspent && '⚠️ '}
                                        {Math.abs(remainder).toLocaleString('ru-RU')} {material.unit}
                                    </Typography>
                                </Box>
                            </Box>
                        </Stack>
                    </Box>

                    {isOverspent && (
                        <Alert severity="warning" icon={<span>⚠️</span>}>
                            <strong>Перерасход материала:</strong> Закуплено на {Math.abs(remainder).toLocaleString('ru-RU')} {material.unit} больше чем в смете.
                            Это количество будет включено в список для доп. оплаты клиенту.
                        </Alert>
                    )}

                    <TextField
                        label="Количество"
                        type="number"
                        fullWidth
                        value={form.quantity}
                        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        inputProps={{ min: 0, step: 0.01 }}
                        helperText={
                            remainder > 0
                                ? `Ед. изм.: ${material.unit}. Осталось: ${remainder.toLocaleString('ru-RU')} (можно закупить больше)`
                                : remainder < 0
                                    ? `Ед. изм.: ${material.unit}. Перерасход: ${Math.abs(remainder).toLocaleString('ru-RU')}`
                                    : `Ед. изм.: ${material.unit}. Закуплено полностью (можно закупить дополнительно)`
                        }
                    />

                    <TextField
                        label="Фактическая цена закупки"
                        type="number"
                        fullWidth
                        value={form.purchasePrice}
                        onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
                        inputProps={{ min: 0, step: 0.01 }}
                        helperText="Реальная цена, по которой купили материал"
                    />

                    <TextField
                        label="Дата закупки"
                        type="date"
                        fullWidth
                        value={form.purchaseDate}
                        onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />

                    {error && <Alert severity="error">{error}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={submitting}>
                    Отмена
                </Button>
                <Button
                    variant="contained"
                    onClick={onSubmit}
                    disabled={submitting || !form.quantity || !form.purchasePrice}
                    startIcon={submitting ? <CircularProgress size={16} /> : <IconShoppingCartPlus />}
                >
                    {submitting ? 'Добавление...' : 'Добавить'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

AddPurchaseDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    material: PropTypes.object,
    form: PropTypes.object.isRequired,
    setForm: PropTypes.func.isRequired,
    submitting: PropTypes.bool.isRequired,
    onSubmit: PropTypes.func.isRequired,
    error: PropTypes.string
};

export default AddPurchaseDialog;
