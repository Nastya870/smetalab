import React from 'react';
import PropTypes from 'prop-types';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper,
    Typography,
    Stack,
    Tooltip,
    Avatar,
    IconButton,
    Chip,
    alpha
} from '@mui/material';
import {
    IconCheck,
    IconAlertTriangle,
    IconPhoto,
    IconShoppingCartPlus
} from '@tabler/icons-react';
import { formatCurrency } from 'shared/lib/formatters';
import { estimateColors as colors } from 'shared/ui/themes/estimateStyle';

const PurchasesTable = ({
    regularMaterials,
    extraMaterials,
    getPurchaseStatus,
    onOpenAddDialog
}) => {
    const renderRow = (material, index, isExtra = false) => {
        const status = getPurchaseStatus(material);
        const remainder = material.quantity - (material.purchasedQuantity || 0);
        const prefix = isExtra ? 'extra' : 'regular';

        return (
            <TableRow
                key={`${prefix}-${index}`}
                sx={{
                    bgcolor: isExtra ? alpha(colors.warning, 0.08) : (index % 2 === 0 ? '#fff' : '#FAFAFA'),
                    '&:hover': { bgcolor: isExtra ? alpha(colors.warning, 0.15) : colors.cardBg },
                    transition: 'background-color 0.15s',
                    '& td': {
                        py: 0.75,
                        borderBottom: `1px solid ${colors.border}`
                    },
                    ...(!isExtra && status === 'over' && {
                        borderLeft: `3px solid ${colors.error}`
                    })
                }}
            >
                {/* Артикул */}
                <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        {isExtra && (
                            <Chip
                                label="О/Ч"
                                size="small"
                                sx={{ bgcolor: colors.warning, color: '#fff', fontSize: '0.65rem', height: 18, fontWeight: 600 }}
                            />
                        )}
                        <Typography variant="caption" sx={{ fontWeight: 500, color: colors.primary, fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {material.sku || '-'}
                        </Typography>
                    </Stack>
                </TableCell>

                {/* Наименование */}
                <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        {!isExtra && (
                            <>
                                {status === 'complete' && <IconCheck size={16} color={colors.green} />}
                                {status === 'partial' && <IconAlertTriangle size={16} color={colors.warning} />}
                                {status === 'over' && <IconAlertTriangle size={16} color={colors.error} />}
                            </>
                        )}
                        <Typography variant="caption" sx={{ color: '#374151', fontWeight: isExtra ? 500 : 400, fontSize: '0.75rem' }}>
                            {material.name}
                        </Typography>
                    </Stack>
                </TableCell>

                {/* Категория */}
                <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        {material.categoryFullPath ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                                {material.categoryFullPath.split(' / ').map((part, idx, arr) => (
                                    <React.Fragment key={idx}>
                                        <Typography sx={{ fontSize: '0.7rem', color: idx === arr.length - 1 ? colors.primary : '#9CA3AF', fontWeight: idx === arr.length - 1 ? 500 : 400 }}>
                                            {part}
                                        </Typography>
                                        {idx < arr.length - 1 && (
                                            <Typography sx={{ fontSize: '0.7rem', color: '#D1D5DB' }}>›</Typography>
                                        )}
                                    </React.Fragment>
                                ))}
                            </Box>
                        ) : (
                            <Typography sx={{ fontSize: '0.75rem', color: colors.textSecondary }}>
                                {material.category || '—'}
                            </Typography>
                        )}
                    </Box>
                </TableCell>

                {/* Фото */}
                <TableCell align="center">
                    {material.image ? (
                        <Tooltip title="Нажмите для увеличения">
                            <Avatar
                                src={material.image}
                                alt={material.name}
                                variant="rounded"
                                sx={{
                                    width: 36,
                                    height: 36,
                                    border: `1px solid ${isExtra ? colors.warning : colors.border}`,
                                    margin: '0 auto',
                                    cursor: 'pointer',
                                    '&:hover': { opacity: 0.8 }
                                }}
                            />
                        </Tooltip>
                    ) : (
                        <Avatar
                            variant="rounded"
                            sx={{
                                width: 36,
                                height: 36,
                                bgcolor: isExtra ? colors.warning : '#F3F4F6',
                                color: isExtra ? '#fff' : 'inherit',
                                margin: '0 auto'
                            }}
                        >
                            <IconPhoto size={16} color={isExtra ? '#fff' : "#9CA3AF"} />
                        </Avatar>
                    )}
                </TableCell>

                {/* Ед. изм. */}
                <TableCell align="center">
                    <Typography variant="caption" sx={{ color: colors.textSecondary, fontSize: '0.75rem' }}>
                        {material.unit}
                    </Typography>
                </TableCell>

                {/* Нужно */}
                <TableCell align="right">
                    <Typography variant="caption" sx={{ fontWeight: 500, color: '#374151', fontSize: '0.75rem' }}>
                        {material.quantity.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </Typography>
                </TableCell>

                {/* Закуплено */}
                <TableCell align="right">
                    <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, color: material.purchasedQuantity > 0 ? colors.green : colors.textSecondary, fontSize: '0.75rem' }}
                    >
                        {(material.purchasedQuantity || 0).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </Typography>
                </TableCell>

                {/* Остаток */}
                <TableCell
                    align="right"
                    sx={{
                        bgcolor: status === 'complete' ? colors.greenLight :
                            status === 'over' ? colors.errorLight :
                                (isExtra ? alpha(colors.warning, 0.2) : (status === 'partial' ? colors.warningLight : 'transparent'))
                    }}
                >
                    {status === 'complete' ? (
                        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                            <IconCheck size={14} color={colors.green} />
                            <Typography variant="caption" sx={{ fontWeight: 600, color: colors.green, fontSize: '0.75rem' }}>Закуплено</Typography>
                        </Stack>
                    ) : status === 'none' && !isExtra ? (
                        <Typography variant="caption" sx={{ color: '#9CA3AF', textAlign: 'right', fontSize: '0.75rem' }}>—</Typography>
                    ) : (
                        <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
                            <IconAlertTriangle
                                size={14}
                                color={status === 'over' ? colors.error : (isExtra ? '#92400E' : colors.warning)}
                            />
                            <Typography
                                variant="caption"
                                sx={{ fontWeight: 600, color: status === 'over' ? colors.error : (isExtra ? '#92400E' : colors.warning), fontSize: '0.75rem' }}
                            >
                                {remainder.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            </Typography>
                        </Stack>
                    )}
                </TableCell>

                {/* ПЛАН */}
                <TableCell align="right" sx={{ borderLeft: `2px solid ${colors.border}`, bgcolor: isExtra ? alpha(colors.warning, 0.05) : 'inherit' }}>
                    <Typography variant="caption" sx={{ color: isExtra ? '#92400E' : '#374151', fontWeight: isExtra ? 500 : 400, fontSize: '0.75rem' }}>
                        {formatCurrency(material.price)}
                    </Typography>
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: isExtra ? alpha(colors.warning, 0.05) : 'inherit' }}>
                    <Typography variant="caption" sx={{ fontWeight: isExtra ? 700 : 600, color: isExtra ? '#92400E' : '#1F2937', fontSize: '0.75rem' }}>
                        {formatCurrency(material.total)}
                    </Typography>
                </TableCell>

                {/* ФАКТ */}
                <TableCell align="right" sx={{ borderLeft: `2px solid ${colors.green}`, bgcolor: isExtra ? alpha(colors.warning, 0.05) : 'inherit' }}>
                    {material.avgPurchasePrice ? (
                        <Typography variant="caption" sx={{ fontWeight: 500, color: colors.green, fontSize: '0.75rem' }}>
                            {formatCurrency(material.avgPurchasePrice)}
                        </Typography>
                    ) : (
                        <Typography variant="caption" sx={{ color: '#D1D5DB', fontSize: '0.75rem' }}>—</Typography>
                    )}
                </TableCell>
                <TableCell align="right" sx={{ bgcolor: isExtra ? alpha(colors.warning, 0.05) : 'inherit' }}>
                    {material.actualTotalPrice > 0 ? (
                        <Typography variant="caption" sx={{ fontWeight: 700, color: colors.green, fontSize: '0.75rem' }}>
                            {formatCurrency(material.actualTotalPrice)}
                        </Typography>
                    ) : (
                        <Typography variant="caption" sx={{ color: '#D1D5DB', fontSize: '0.75rem' }}>—</Typography>
                    )}
                </TableCell>

                {/* Действия */}
                <TableCell align="center" sx={{ '&:hover': { bgcolor: isExtra ? 'rgba(245, 158, 11, 0.06)' : 'rgba(79, 70, 229, 0.04)' } }}>
                    <Tooltip title="Добавить в общие закупки">
                        <IconButton
                            size="medium"
                            onClick={() => onOpenAddDialog(material)}
                            sx={{
                                color: colors.textSecondary,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    color: isExtra ? colors.warning : colors.primary,
                                    bgcolor: isExtra ? alpha(colors.warning, 0.15) : alpha(colors.primary, 0.12),
                                    transform: 'scale(1.05)'
                                }
                            }}
                        >
                            <IconShoppingCartPlus size={24} />
                        </IconButton>
                    </Tooltip>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <Paper sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', borderRadius: '12px', border: `1px solid ${colors.border}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
                <Table stickyHeader size="small" sx={{ minWidth: 1100 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell rowSpan={2} sx={styles.header}>Артикул</TableCell>
                            <TableCell rowSpan={2} sx={styles.header}>Наименование материала</TableCell>
                            <TableCell rowSpan={2} sx={styles.header}>Категория</TableCell>
                            <TableCell rowSpan={2} align="center" sx={styles.header}>Фото</TableCell>
                            <TableCell rowSpan={2} align="center" sx={styles.header}>Ед.</TableCell>
                            <TableCell rowSpan={2} align="right" sx={styles.header}>Нужно</TableCell>
                            <TableCell rowSpan={2} align="right" sx={styles.header}>Закуплено</TableCell>
                            <TableCell rowSpan={2} align="right" sx={styles.header}>
                                <Tooltip title="Остаток = Нужно − Закуплено" arrow>
                                    <span style={{ cursor: 'help', borderBottom: '1px dashed #9CA3AF' }}>Остаток</span>
                                </Tooltip>
                            </TableCell>
                            <TableCell colSpan={2} align="center" sx={{ ...styles.header, borderLeft: `2px solid ${colors.border}` }}>
                                ПЛАН (смета)
                            </TableCell>
                            <TableCell colSpan={2} align="center" sx={{ ...styles.header, bgcolor: colors.greenLight, color: colors.greenDark, borderLeft: `2px solid ${colors.green}` }}>
                                ФАКТ (закупки)
                            </TableCell>
                            <TableCell rowSpan={2} align="center" sx={styles.header}>Действия</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell align="right" sx={{ ...styles.headerSub, borderLeft: `2px solid ${colors.border}` }}>Цена ₽/ед</TableCell>
                            <TableCell align="right" sx={styles.headerSub}>Сумма</TableCell>
                            <TableCell align="right" sx={{ ...styles.headerSub, bgcolor: colors.greenLight, color: colors.greenDark, borderLeft: `2px solid ${colors.green}` }}>Цена ₽/ед</TableCell>
                            <TableCell align="right" sx={{ ...styles.headerSub, bgcolor: colors.greenLight, color: colors.greenDark }}>Сумма</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {regularMaterials.map((m, i) => renderRow(m, i))}
                        {extraMaterials.length > 0 && (
                            <>
                                <TableRow>
                                    <TableCell colSpan={14} sx={{ bgcolor: colors.warningLight, borderTop: `2px solid ${colors.warning}`, py: 1.5 }}>
                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                            <Chip label="О/Ч" size="small" sx={{ bgcolor: colors.warning, color: '#fff', fontWeight: 600 }} />
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#92400E' }}>
                                                Отдельные чеки (не учтены в смете) — {extraMaterials.length} позиций
                                            </Typography>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                                {extraMaterials.map((m, i) => renderRow(m, i, true))}
                            </>
                        )}
                    </TableBody>
                </Table>
            </Box>
        </Paper>
    );
};

const styles = {
    header: {
        fontWeight: 700,
        bgcolor: colors.headerBg,
        color: '#4B5563',
        py: 0.5,
        borderBottom: `1px solid ${colors.border}`,
        fontSize: '10px !important',
        lineHeight: '1.2 !important',
        zIndex: 10 // Ensure header is above content
    },
    headerSub: {
        fontWeight: 700,
        bgcolor: colors.headerBg,
        color: '#4B5563',
        py: 0.5,
        borderBottom: `1px solid ${colors.border}`,
        fontSize: '10px !important',
        lineHeight: '1.2 !important',
        top: 22, // Matches actual first header row height (py:0.5 + fontSize:10px + borders)
        zIndex: 10
    }
};

PurchasesTable.propTypes = {
    regularMaterials: PropTypes.array.isRequired,
    extraMaterials: PropTypes.array.isRequired,
    getPurchaseStatus: PropTypes.func.isRequired,
    onOpenAddDialog: PropTypes.func.isRequired
};

export default PurchasesTable;
