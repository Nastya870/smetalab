import React from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Paper,
    Typography,
    Stack,
    Divider
} from '@mui/material';
import { IconPackage } from '@tabler/icons-react';
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
                p: 1,
                mt: 1,
                borderRadius: '8px',
                border: `1px solid ${colors.border}`,
                bgcolor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1}>
                <IconPackage size={18} color={colors.primary} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#374151', fontSize: '0.8rem' }}>
                    Итоги:
                </Typography>
            </Stack>

            <Stack
                direction="row"
                alignItems="center"
                spacing={3}
                divider={<Divider orientation="vertical" flexItem sx={{ height: 16, my: 'auto' }} />}
            >
                <Stack direction="row" alignItems="baseline" spacing={1}>
                    <Typography variant="caption" sx={{ color: colors.textSecondary }}>План:</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.textPrimary }}>
                        {formatCurrency(totalAmount)}
                    </Typography>
                </Stack>

                <Stack direction="row" alignItems="baseline" spacing={1}>
                    <Typography variant="caption" sx={{ color: !isOverspent ? '#92400E' : '#991B1B' }}>
                        {!isOverspent ? 'Осталось:' : 'Перерасход:'}
                    </Typography>
                    <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, color: !isOverspent ? '#D97706' : '#DC2626' }}
                    >
                        {formatCurrency(Math.abs(diff))}
                    </Typography>
                </Stack>

                <Stack direction="row" alignItems="baseline" spacing={1}>
                    <Typography variant="caption" sx={{ color: colors.greenDark }}>Факт:</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: colors.green }}>
                        {formatCurrency(totalActualAmount)}
                    </Typography>
                </Stack>
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
