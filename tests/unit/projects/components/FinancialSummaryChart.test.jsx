import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FinancialSummaryChart from '../../../../app/projects/FinancialSummaryChart';

// Mock react-apexcharts
vi.mock('react-apexcharts', () => ({
    default: () => <div data-testid="apex-chart">Chart</div>
}));

describe('FinancialSummaryChart Component', () => {
    const mockData = {
        incomeWorks: 100000,
        expenseWorks: 50000,
        incomeMaterials: 200000,
        expenseMaterials: 150000
    };

    it('should render summary cards with correct values', () => {
        render(<FinancialSummaryChart financialSummary={mockData} />);

        // Total Income: 100k + 200k = 300k
        expect(screen.getByText('300 000 ₽')).toBeInTheDocument();

        // Total Expense: 50k + 150k = 200k
        expect(screen.getByText('200 000 ₽')).toBeInTheDocument();

        // Profit: 300k - 200k = 100k
        expect(screen.getByText('100 000 ₽')).toBeInTheDocument();
    });

    it('should render loading state', () => {
        render(<FinancialSummaryChart isLoading={true} />);

        // Check for circular progress (MUI uses role="progressbar")
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.queryByText('300 000 ₽')).not.toBeInTheDocument();
    });

    it('should render chart component', () => {
        render(<FinancialSummaryChart financialSummary={mockData} />);
        expect(screen.getByTestId('apex-chart')).toBeInTheDocument();
    });

    it('should handle zero/missing values gracefully', () => {
        render(<FinancialSummaryChart financialSummary={{}} />);

        // Should show 0 ₽
        const zeros = screen.getAllByText('0 ₽');
        expect(zeros.length).toBeGreaterThan(0);
    });
});
