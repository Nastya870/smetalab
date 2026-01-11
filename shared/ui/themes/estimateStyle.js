export const estimateColors = {
    primary: '#4F46E5',
    primaryLight: '#EEF2FF',
    primaryDark: '#3730A3',
    green: '#10B981',
    greenLight: '#D1FAE5',
    greenDark: '#059669',
    headerBg: '#F3F4F6',
    cardBg: '#F9FAFB',
    totalBg: '#EEF2FF',
    summaryBg: '#F5F3FF',
    border: '#E5E7EB',
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',
    error: '#EF4444',
    errorLight: '#FEE2E2',
};

export const getStatusColor = (status, colors = estimateColors) => {
    switch (status) {
        case 'complete':
            return { bg: colors.greenLight, text: colors.greenDark, label: 'Закуплено' };
        case 'over':
            return { bg: colors.errorLight, text: colors.error, label: 'Перебор' };
        case 'partial':
            return { bg: colors.warningLight, text: colors.warning, label: 'Частично' };
        default:
            return { bg: colors.cardBg, text: colors.textSecondary, label: 'Нет' };
    }
};
