import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../../../../app/projects/EmptyState';

describe('EmptyState Component', () => {
    it('should render empty state message', () => {
        render(<EmptyState onCreateClick={() => { }} />);

        expect(screen.getByText('Нет проектов')).toBeInTheDocument();
        expect(screen.getByText('Создайте ваш первый проект, чтобы начать работу')).toBeInTheDocument();
    });

    it('should call onCreateClick when button is clicked', () => {
        const handleClick = vi.fn();
        render(<EmptyState onCreateClick={handleClick} />);

        const button = screen.getByRole('button', { name: /создать проект/i });
        fireEvent.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });
});
