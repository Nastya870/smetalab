import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import ProjectDialog from '../../../../app/projects/ProjectDialog';
import counterpartiesAPI from 'api/counterparties';
import useAuth from 'hooks/useAuth';

// Mock API
vi.mock('api/counterparties', () => ({
    default: {
        getAll: vi.fn()
    }
}));

// Mock Auth Hook
vi.mock('hooks/useAuth', () => ({
    default: vi.fn()
}));

// Mock utils
vi.mock('../../../../app/projects/utils', () => ({
    getStatusText: (status) => status
}));

describe('ProjectDialog Component', () => {
    const mockProject = {
        client: '',
        contractor: '',
        address: '',
        objectName: '',
        startDate: '',
        endDate: '',
        status: 'planning',
        progress: 0
    };

    const mockHandlers = {
        onClose: vi.fn(),
        onSave: vi.fn(),
        onDelete: vi.fn(),
        onChange: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.mockReturnValue({ tenant: { name: 'My Company' } });
        counterpartiesAPI.getAll.mockResolvedValue([
            { id: 1, entityType: 'legal', companyName: 'Client A' },
            { id: 2, entityType: 'individual', fullName: 'Client B' }
        ]);
    });

    it('should render in Create mode', async () => {
        render(
            <ProjectDialog
                open={true}
                editMode={false}
                project={mockProject}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('Создать новый проект')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Создать проект' })).toBeInTheDocument();
        expect(screen.queryByText('Удалить')).not.toBeInTheDocument();
    });

    it('should render in Edit mode', async () => {
        render(
            <ProjectDialog
                open={true}
                editMode={true}
                project={{ ...mockProject, id: 1 }}
                {...mockHandlers}
            />
        );

        expect(screen.getByText('Редактировать проект')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Сохранить' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Удалить' })).toBeInTheDocument();
    });

    it('should load counterparties on open', async () => {
        render(
            <ProjectDialog
                open={true}
                editMode={false}
                project={mockProject}
                {...mockHandlers}
            />
        );

        expect(counterpartiesAPI.getAll).toHaveBeenCalled();

        // Find Autocomplete input
        const autocompleteInput = screen.getByRole('combobox');

        // Interact to open dropdown
        fireEvent.focus(autocompleteInput);
        fireEvent.keyDown(autocompleteInput, { key: 'ArrowDown' });

        await waitFor(() => {
            expect(screen.getByText('Client A')).toBeInTheDocument();
            expect(screen.getByText('Client B')).toBeInTheDocument();
        });
    });

    it('should call onChange when fields are modified', () => {
        render(
            <ProjectDialog
                open={true}
                editMode={false}
                project={mockProject}
                {...mockHandlers}
            />
        );

        // Use placeholder text for robustness
        const addressInput = screen.getByPlaceholderText('Полный адрес строительного объекта');
        fireEvent.change(addressInput, { target: { value: 'New Address' } });
        expect(mockHandlers.onChange).toHaveBeenCalledWith('address', 'New Address');

        const objectNameInput = screen.getByPlaceholderText('Название строительного объекта');
        fireEvent.change(objectNameInput, { target: { value: 'New Object' } });
        expect(mockHandlers.onChange).toHaveBeenCalledWith('objectName', 'New Object');
    });

    it('should disable Save button if form is invalid', () => {
        render(
            <ProjectDialog
                open={true}
                editMode={false}
                project={mockProject} // Empty fields
                {...mockHandlers}
            />
        );

        const saveButton = screen.getByRole('button', { name: 'Создать проект' });
        expect(saveButton).toBeDisabled();
    });

    it('should enable Save button if form is valid', () => {
        const validProject = {
            ...mockProject,
            client: 'Client A',
            address: 'Address 1',
            objectName: 'Object 1'
        };

        render(
            <ProjectDialog
                open={true}
                editMode={false}
                project={validProject}
                {...mockHandlers}
            />
        );

        const saveButton = screen.getByRole('button', { name: 'Создать проект' });
        expect(saveButton).toBeEnabled();

        fireEvent.click(saveButton);
        expect(mockHandlers.onSave).toHaveBeenCalledWith(validProject);
    });

    it('should auto-set contractor from tenant', () => {
        render(
            <ProjectDialog
                open={true}
                editMode={false}
                project={mockProject}
                {...mockHandlers}
            />
        );

        expect(mockHandlers.onChange).toHaveBeenCalledWith('contractor', 'My Company');
    });
});
