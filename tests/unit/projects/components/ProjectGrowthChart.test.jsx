import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProjectGrowthChart from '../../../../app/projects/ProjectGrowthChart';
import workCompletionActsAPI from 'api/workCompletionActs';
import purchasesAPI from 'api/purchases';

// Mock APIs
vi.mock('api/workCompletionActs', () => ({
    default: {
        getActsByEstimate: vi.fn()
    }
}));

vi.mock('api/purchases', () => ({
    default: {
        getByEstimateId: vi.fn()
    }
}));

// Mock react-apexcharts
vi.mock('react-apexcharts', () => ({
    default: () => <div data-testid="apex-chart">Chart</div>
}));

// Mock chart data config
vi.mock('../dashboard/Default/chart-data/total-growth-bar-chart', () => ({
    default: {
        series: [],
        options: {}
    }
}));

describe('ProjectGrowthChart Component', () => {
    const mockEstimates = [
        { id: 1 },
        { id: 2 }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render loading state initially', () => {
        // Mock promises that don't resolve immediately
        workCompletionActsAPI.getActsByEstimate.mockReturnValue(new Promise(() => { }));

        render(<ProjectGrowthChart projectId="1" estimates={mockEstimates} />);

        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should fetch data and render chart', async () => {
        // Mock API responses
        workCompletionActsAPI.getActsByEstimate.mockResolvedValue([
            { actType: 'client', totalAmount: 10000 },
            { actType: 'specialist', totalAmount: 5000 }
        ]);

        purchasesAPI.getByEstimateId.mockResolvedValue({
            purchases: [
                { total: 20000, actualTotalPrice: 15000 }
            ]
        });

        render(<ProjectGrowthChart projectId="1" estimates={mockEstimates} />);

        // Wait for loading to finish
        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        expect(screen.getByTestId('apex-chart')).toBeInTheDocument();
        expect(screen.getByText('Финансовая аналитика')).toBeInTheDocument();

        // Check if API was called for each estimate
        expect(workCompletionActsAPI.getActsByEstimate).toHaveBeenCalledTimes(2);
        expect(purchasesAPI.getByEstimateId).toHaveBeenCalledTimes(2);
    });

    it('should handle API errors gracefully', async () => {
        workCompletionActsAPI.getActsByEstimate.mockRejectedValue(new Error('API Error'));

        // Should not crash, just show empty/partial data
        render(<ProjectGrowthChart projectId="1" estimates={mockEstimates} />);

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });

        expect(screen.getByText('Финансовая аналитика')).toBeInTheDocument();
    });

    it('should not fetch if no estimates', async () => {
        render(<ProjectGrowthChart projectId="1" estimates={[]} />);

        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        expect(workCompletionActsAPI.getActsByEstimate).not.toHaveBeenCalled();
    });
});
