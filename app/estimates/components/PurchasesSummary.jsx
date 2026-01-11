import React from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Paper,
    Typography,
    Stack,
    Divider,
    Chip
} from '@mui/material';
import { IconPackage, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import { formatCurrency } from 'shared/lib/formatters';
import { estimateColors as colors } from 'shared/ui/themes/estimateStyle';

const PurchasesSummary = ({
    totalAmount,
    totalActualAmount,
    regularMaterials,
    extraMaterials,
    getPurchaseStatus
}) => {
    const diff = totalAmount - totalActualAmount;
    const isOverspent = diff < 0;

    return (
        <Paper
            sx={{
                p: 2,
                mt: 2,
                borderRadius: '10px',
                border: `1px solid ${colors.border}`,
                bgcolor: '#FAFAFA'
            }}
        >
            <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', md: 'center' }}
                spacing={1.5}
                sx={{ mb: 1.5 }}
            >
                <Stack direction="row" alignItems="center" spacing={1}>
                    <IconPackage size={18} color={colors.primary} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#374151' }}>
                        Итоги закупок
                    </Typography>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                        icon={<IconCheck size={14} />}
                        label={`${regularMaterials.filter(m => getPurchaseStatus(m) === 'complete').length}`}
                        size="small"
                        sx={{
                            bgcolor: colors.greenLight,
                            color: colors.greenDark,
                            height: 26,
                            fontSize: '0.75rem',
                            '& .MuiChip-icon': { color: colors.green }
                        }}
                    />
                    <Chip
                        icon={<IconAlertTriangle size={14} />}
                        label={`${regularMaterials.filter(m => getPurchaseStatus(m) === 'partial').length}`}
                        size="small"
                        sx={{
                            bgcolor: colors.warningLight,
                            color: '#92400E',
                            height: 26,
                            fontSize: '0.75rem',
                            '& .MuiChip-icon': { color: colors.warning }
                        }}
                    />
                    <Chip
                        label={`${regularMaterials.filter(m => getPurchaseStatus(m) === 'none').length}`}
                        size="small"
                        sx={{
                            bgcolor: '#E5E7EB',
                            color: '#6B7280',
                            height: 26,
                            fontSize: '0.75rem'
                        }}
                    />
                    {extraMaterials.length > 0 && (
                        <Chip
                            label={`О/Ч: ${extraMaterials.length}`}
                            size="small"
                            sx={{
                                bgcolor: colors.warningLight,
                                color: '#92400E',
                                height: 26,
                                fontSize: '0.75rem'
                            }}
                        />
                    )}
                </Stack>
            </Stack>

            <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1.5}
                divider={<Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />}
            >
                <Box sx={{ flex: 1, textAlign: { xs: 'left', sm: 'center' }, py: 1 }}>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>План (смета)</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: colors.textPrimary }}>
                        {formatCurrency(totalAmount)}
                    </Typography>
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        textAlign: { xs: 'left', sm: 'center' },
                        py: 1, px: 2,
                        bgcolor: !isOverspent ? '#FEF3C7' : '#FEE2E2',
                        borderRadius: '8px',
                        border: `1px solid ${!isOverspent ? '#F59E0B' : colors.error}`
                    }}
                >
                    <Typography variant="caption" sx={{ color: !isOverspent ? '#92400E' : '#991B1B' }}>
                        {!isOverspent ? 'Осталось' : 'Перерасход'}
                    </Typography>
                    <Typography
                        variant="h6"
                        sx={{ fontWeight: 700, color: !isOverspent ? '#D97706' : '#DC2626' }}
                    >
                        {formatCurrency(Math.abs(diff))}
                    </Typography>
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        textAlign: { xs: 'left', sm: 'center' },
                        py: 1, px: 2,
                        bgcolor: colors.greenLight,
                        borderRadius: '8px'
                    }}
                >
                    <Typography variant="caption" sx={{ color: colors.greenDark }}>Закуплено (факт)</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: colors.green }}>
                        {formatCurrency(totalActualAmount)}
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
};

PurchasesSummary.propTypes = {
    totalAmount: PropTypes.number.isRequired,
    totalActualAmount: PropTypes.number.isRequired,
    regularMaterials: PropTypes.array.isRequired,
    extraMaterials: PropTypes.array.isRequired,
    getPurchaseStatus: PropTypes.func.isRequired
};

export default PurchasesSummary;
