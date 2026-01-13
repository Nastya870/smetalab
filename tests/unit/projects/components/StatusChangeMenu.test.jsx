import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StatusChangeMenu from '../../../../app/projects/StatusChangeMenu';

// Mock utils
vi.mock('../../../../app/projects/utils', () => ({
    getStatusColor: (status) => 'primary',
    getStatusText: (status) => {
        const texts = {
            planning: 'Планирование',
            approval: 'Согласование',
            in_progress: 'В работе',
            rejected: 'Отказ',
            completed: 'Завершён'
        };
        return texts[status] || status;
    }
}));

describe('StatusChangeMenu Component', () => {
    const mockHandleChange = vi.fn();

    it('should render current status', () => {
        render(
            <StatusChangeMenu
                currentStatus="in_progress"
                onStatusChange={mockHandleChange}
            />
        );

        expect(screen.getByText('В работе')).toBeInTheDocument();
    });

    it('should open menu on click', () => {
        render(
            <StatusChangeMenu
                currentStatus="in_progress"
                onStatusChange={mockHandleChange}
            />
        );

        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(screen.getByRole('menu')).toBeInTheDocument();
        expect(screen.getByText('Планирование')).toBeInTheDocument();
        expect(screen.getByText('Согласование')).toBeInTheDocument();
        expect(screen.getByText('Отказ')).toBeInTheDocument();
    });

    it('should call onStatusChange when new status selected', async () => {
        render(
            <StatusChangeMenu
                currentStatus="in_progress"
                onStatusChange={mockHandleChange}
            />
        );

        // Open menu
        fireEvent.click(screen.getByRole('button'));

        // Click 'Completed'
        fireEvent.click(screen.getByText('Завершён'));

        expect(mockHandleChange).toHaveBeenCalledWith('completed');
    });

    it('should not call onStatusChange if same status selected', async () => {
        render(
            <StatusChangeMenu
                currentStatus="in_progress"
                onStatusChange={mockHandleChange}
            />
        );

        // Open menu
        fireEvent.click(screen.getByRole('button'));

        // Click 'In Progress' (current)
        // Note: The menu item text might be "В работе" and possibly "Текущий" chip.
        // We target the menu item.
        const menuItems = screen.getAllByText('В работе');
        // One is in the button, one in the menu. The menu one is likely the second one or inside a listitem.
        // Let's use getAllByRole('menuitem') and find the one with text.

        const inProgressItem = screen.getAllByRole('menuitem').find(item => item.textContent.includes('В работе'));
        fireEvent.click(inProgressItem);

        expect(mockHandleChange).not.toHaveBeenCalled();
    });

    it('should show loading state', () => {
        render(
            <StatusChangeMenu
                currentStatus="in_progress"
                onStatusChange={mockHandleChange}
                loading={true}
            />
        );

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        // Check for progress indicator (MuiCircularProgress)
        // Usually has role="progressbar"
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
});
