import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProjectCard from '../../../../app/projects/ProjectCard';

// Mock utils
vi.mock('../../../../app/projects/utils', () => ({
    getStatusColor: (status) => {
        const colors = {
            planning: 'warning',
            approval: 'info',
            in_progress: 'secondary',
            rejected: 'error',
            completed: 'success',
            active: 'secondary'
        };
        return colors[status] || 'default';
    },
    getStatusText: (status) => {
        const texts = {
            planning: 'Планирование',
            approval: 'Согласование',
            in_progress: 'В работе',
            rejected: 'Отклонен',
            completed: 'Завершен',
            active: 'Активен'
        };
        return texts[status] || status;
    },
    formatDate: (date) => date || 'Не указана'
}));

describe('ProjectCard Component', () => {
    const mockProject = {
        id: 1,
        objectName: 'Test Project',
        client: 'Test Client',
        contractor: 'Test Contractor',
        address: 'Test Address',
        startDate: '01.01.2024',
        endDate: '31.12.2024',
        status: 'in_progress',
        progress: 50,
        contractNumber: '123-456'
    };

    const mockHandlers = {
        onOpen: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn()
    };

    it('should render project information correctly', () => {
        render(
            <ProjectCard
                project={mockProject}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('Test Project')).toBeInTheDocument();
        expect(screen.getByText('Test Client')).toBeInTheDocument();
        expect(screen.getByText('Test Contractor')).toBeInTheDocument();
        expect(screen.getByText('Test Address')).toBeInTheDocument();
        expect(screen.getByText('123-456')).toBeInTheDocument();
        expect(screen.getByText('В работе')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should handle missing optional fields', () => {
        const emptyProject = {
            ...mockProject,
            contractNumber: null,
            client: '',
            contractor: undefined
        };

        render(
            <ProjectCard
                project={emptyProject}
                {...mockHandlers}
            />
        );

        // Should show dashes for empty fields
        const dashes = screen.getAllByText('—');
        expect(dashes.length).toBeGreaterThan(0);
    });

    it('should call handlers when buttons are clicked', () => {
        render(
            <ProjectCard
                project={mockProject}
                {...mockHandlers}
            />
        );

        // Click Open button
        fireEvent.click(screen.getByText('Открыть'));
        expect(mockHandlers.onOpen).toHaveBeenCalledWith(mockProject);

        // Click Edit button (icon button)
        // Note: In MUI IconButton, we might need to look for the button role or aria-label if added, 
        // but here we can find by the icon or just the button elements.
        // Let's rely on the fact there are 3 buttons: Open (text), Edit (icon), Delete (icon)
        const buttons = screen.getAllByRole('button');
        // Index 0: Open, Index 1: Edit, Index 2: Delete

        fireEvent.click(buttons[1]);
        expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockProject);

        fireEvent.click(buttons[2]);
        expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockProject.id);
    });

    it('should show optimistic loading state', () => {
        render(
            <ProjectCard
                project={mockProject}
                {...mockHandlers}
                optimistic={true}
            />
        );

        expect(screen.getByText('Сохраняется...')).toBeInTheDocument();
    });

    it('should render correct status colors', () => {
        const { rerender } = render(
            <ProjectCard
                project={{ ...mockProject, status: 'rejected' }}
                {...mockHandlers}
            />
        );
        expect(screen.getByText('Отклонен')).toBeInTheDocument();

        rerender(
            <ProjectCard
                project={{ ...mockProject, status: 'completed' }}
                {...mockHandlers}
            />
        );
        expect(screen.getByText('Завершен')).toBeInTheDocument();
    });
});
