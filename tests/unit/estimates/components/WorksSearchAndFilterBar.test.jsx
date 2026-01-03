import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorksSearchAndFilterBar from 'app/estimates/components/WorksSearchAndFilterBar';

describe('WorksSearchAndFilterBar', () => {
  const defaultProps = {
    searchTerm: '',
    onSearchChange: vi.fn(),
    hasAvailableFilters: false,
    hasActiveFilter: false,
    onOpenFilters: vi.fn()
  };

  it('should render search field with placeholder', () => {
    render(<WorksSearchAndFilterBar {...defaultProps} />);
    expect(screen.getByPlaceholderText('Поиск работ...')).toBeInTheDocument();
  });

  it('should display search term value', () => {
    render(<WorksSearchAndFilterBar {...defaultProps} searchTerm="Кирпич" />);
    const input = screen.getByPlaceholderText('Поиск работ...');
    expect(input).toHaveValue('Кирпич');
  });

  it('should call onSearchChange when typing', () => {
    const onSearchChange = vi.fn();
    render(<WorksSearchAndFilterBar {...defaultProps} onSearchChange={onSearchChange} />);
    
    const input = screen.getByPlaceholderText('Поиск работ...');
    fireEvent.change(input, { target: { value: 'Бетон' } });
    
    expect(onSearchChange).toHaveBeenCalledWith('Бетон');
  });

  it('should NOT render filter button when hasAvailableFilters is false', () => {
    render(<WorksSearchAndFilterBar {...defaultProps} hasAvailableFilters={false} />);
    // Кнопка фильтра не должна быть в DOM
    const filterButtons = screen.queryAllByRole('button');
    expect(filterButtons.length).toBe(0);
  });

  it('should render filter button when hasAvailableFilters is true', () => {
    render(<WorksSearchAndFilterBar {...defaultProps} hasAvailableFilters={true} />);
    const filterButton = screen.getByRole('button');
    expect(filterButton).toBeInTheDocument();
  });

  it('should NOT show badge when hasActiveFilter is false', () => {
    render(<WorksSearchAndFilterBar {...defaultProps} hasAvailableFilters={true} hasActiveFilter={false} />);
    // Badge с цифрой "1" не должен быть виден
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('should show badge "1" when hasActiveFilter is true', () => {
    render(<WorksSearchAndFilterBar {...defaultProps} hasAvailableFilters={true} hasActiveFilter={true} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('should call onOpenFilters when filter button clicked', () => {
    const onOpenFilters = vi.fn();
    render(<WorksSearchAndFilterBar {...defaultProps} hasAvailableFilters={true} onOpenFilters={onOpenFilters} />);
    
    const filterButton = screen.getByRole('button');
    fireEvent.click(filterButton);
    
    expect(onOpenFilters).toHaveBeenCalledTimes(1);
  });

  it('should render search icon', () => {
    const { container } = render(<WorksSearchAndFilterBar {...defaultProps} />);
    // IconSearch рендерится как svg
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });
});
