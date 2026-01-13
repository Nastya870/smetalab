import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProjectDashboard from '../../../../app/projects/ProjectDashboard';
import { useProjectDashboard } from 'hooks/useProjectDashboard';
import { useNotifications } from 'contexts/NotificationsContext';
import { projectsAPI } from 'api/projects';
import { estimatesAPI } from 'api/estimatesAPI';

// Mock Hooks
vi.mock('hooks/useProjectDashboard', () => ({
    useProjectDashboard: vi.fn()
}));

vi.mock('contexts/NotificationsContext', () => ({
    useNotifications: vi.fn()
}));

// Mock APIs
vi.mock('api/projects', () => ({
    projectsAPI: {
        update: vi.fn(),
        delete: vi.fn(),
        updateStatus: vi.fn()
    }
}));

vi.mock('api/estimatesAPI', () => ({
    estimatesAPI: {
        create: vi.fn(),
        delete: vi.fn(),
        update: vi.fn()
    }
}));

// Mock Icons
vi.mock('@tabler/icons-react', () => {
    const IconMock = () => <span data-testid="icon">Icon</span>;
    return {
        IconArrowLeft: IconMock,
        IconBriefcase: IconMock,
        IconCalendar: IconMock,
        IconMapPin: IconMock,
        IconEdit: IconMock,
        IconFileText: IconMock,
        IconClock: IconMock,
        IconTrash: IconMock,
        IconCheck: IconMock,
        IconProgress: IconMock,
        IconBuilding: IconMock,
        IconFolderPlus: IconMock,
        IconInfoCircle: IconMock
    };
});

// Mock Child Components
vi.mock('./ProjectDialog', () => ({
    default: ({ open, onSave, onClose }) => open ? (
        <div data-testid="project-dialog">
            Project Dialog
            <button onClick={onClose}>Close</button>
            <button onClick={onSave}>Save</button>
        </div>
    ) : null
}));

vi.mock('../estimates/CreateEstimateDialog', () => ({
    default: ({ open, onClose }) => open ? (
        <div data-testid="create-estimate-dialog">
            Create Estimate Dialog
            <button onClick={onClose}>Close</button>
        </div>
    ) : null
}));

vi.mock('./StatusChangeMenu', () => ({
    default: ({ currentStatus, onStatusChange }) => (
        <button onClick={() => onStatusChange('completed')}>
            Status: {currentStatus}
        </button>
    )
}));

vi.mock('./FinancialSummaryChart', () => ({
    default: () => <div data-testid="financial-chart">Financial Chart</div>
}));

describe.skip('ProjectDashboard Component', () => {
    const mockProject = {
        id: '1',
        objectName: 'Test Project',
        client: 'Client A',
        status: 'in_progress',
        progress: 50,
        startDate: '2024-01-01',
        endDate: '2024-12-31'
    };

    const mockEstimates = [
        { id: 'e1', name: 'Estimate 1', status: 'draft', created_at: '2024-01-01' }
    ];

    const mockRefresh = vi.fn();
    const mockSuccess = vi.fn();
    const mockError = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        useProjectDashboard.mockReturnValue({
            project: mockProject,
            estimates: mockEstimates,
            financialSummary: {},
            isLoading: false,
            error: null,
            refresh: mockRefresh
        });

        useNotifications.mockReturnValue({
            success: mockSuccess,
            error: mockError
        });
    });

    const renderWithRouter = () => {
        return render(
            <MemoryRouter initialEntries={['/projects/1']}>
                <Routes>
                    <Route path="/projects/:id" element={<ProjectDashboard />} />
                </Routes>
            </MemoryRouter>
        );
    };

    it('should render loading state', () => {
        useProjectDashboard.mockReturnValue({ isLoading: true });
        renderWithRouter();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render error state', () => {
        useProjectDashboard.mockReturnValue({
            isLoading: false,
            error: { message: 'Failed to load' }
        });
        renderWithRouter();
        expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });

    it('should render project info and estimates', () => {
        renderWithRouter();

        expect(screen.getByText('Test Project')).toBeInTheDocument();
        expect(screen.getByText('Client A')).toBeInTheDocument();
        expect(screen.getByText('Estimate 1')).toBeInTheDocument();
        expect(screen.getByTestId('financial-chart')).toBeInTheDocument();
    });

    it('should open edit dialog', () => {
        renderWithRouter();

        const editButton = screen.getByText('Редактировать');
        fireEvent.click(editButton);

        expect(screen.getByTestId('project-dialog')).toBeInTheDocument();
    });

    it('should open create estimate dialog', () => {
        renderWithRouter();

        const createButton = screen.getByText('Создать смету');
        fireEvent.click(createButton);

        expect(screen.getByTestId('create-estimate-dialog')).toBeInTheDocument();
    });

    it('should handle status change', async () => {
        renderWithRouter();

        const statusButton = screen.getByText('Status: in_progress');
        fireEvent.click(statusButton);

        expect(projectsAPI.updateStatus).toHaveBeenCalledWith('1', 'completed');
        await waitFor(() => {
            expect(mockRefresh).toHaveBeenCalled();
            expect(mockSuccess).toHaveBeenCalled();
        });
    });

    it('should handle delete estimate', async () => {
        // Mock window.confirm
        vi.spyOn(window, 'confirm').mockReturnValue(true);

        renderWithRouter();

        const rows = screen.getAllByRole('row');
        const dataRow = rows[1];
        const buttons = within(dataRow).getAllByRole('button');
        const deleteButton = buttons[0];

        fireEvent.click(deleteButton);

        expect(estimatesAPI.delete).toHaveBeenCalledWith('e1');
        await waitFor(() => {
            expect(mockRefresh).toHaveBeenCalled();
            expect(mockSuccess).toHaveBeenCalled();
        });
    });
});
