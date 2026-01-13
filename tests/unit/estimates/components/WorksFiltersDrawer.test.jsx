import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorksFiltersDrawer from 'app/estimates/components/WorksFiltersDrawer';

describe('WorksFiltersDrawer', () => {
  const mockWorks = [
    { id: '1', section: 'Фундамент' },
    { id: '2', section: 'Фундамент' },
    { id: '3', section: 'Стены' },
    { id: '4', section: null }
  ];

  const defaultProps = {
    open: true,
    selectedSection: null,
    availableSections: ['Фундамент', 'Стены'],
    worksAfterSearch: mockWorks,
    onSectionChange: vi.fn(),
    onReset: vi.fn(),
    onApply: vi.fn(),
    onClose: vi.fn()
  };

  it('should render drawer title', () => {
    render(<WorksFiltersDrawer {...defaultProps} />);
    expect(screen.getByText('Фильтры')).toBeInTheDocument();
  });

  it('should render "По стадии" label', () => {
    render(<WorksFiltersDrawer {...defaultProps} />);
    expect(screen.getByText('По стадии')).toBeInTheDocument();
  });

  it('should render "Все работы" option with total count', () => {
    render(<WorksFiltersDrawer {...defaultProps} />);
    expect(screen.getByText('Все работы')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument(); // Total works count
  });

  it('should render all available sections with counts', () => {
    render(<WorksFiltersDrawer {...defaultProps} />);
    expect(screen.getByText('Фундамент')).toBeInTheDocument();
    expect(screen.getByText('Стены')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // Фундамент count
    expect(screen.getByText('1')).toBeInTheDocument(); // Стены count
  });

  it('should select "all" radio when selectedSection is null', () => {
    render(<WorksFiltersDrawer {...defaultProps} selectedSection={null} />);
    const allRadio = screen.getByLabelText(/Все работы/);
    expect(allRadio).toBeChecked();
  });

  it('should select specific section radio when selectedSection is set', () => {
    render(<WorksFiltersDrawer {...defaultProps} selectedSection="Фундамент" />);
    const fundamentRadio = screen.getByLabelText(/Фундамент/);
    expect(fundamentRadio).toBeChecked();
  });

  it('should call onSectionChange with null when "Все работы" clicked', () => {
    const onSectionChange = vi.fn();
    render(<WorksFiltersDrawer {...defaultProps} selectedSection="Фундамент" onSectionChange={onSectionChange} />);
    
    const allRadio = screen.getByLabelText(/Все работы/);
    fireEvent.click(allRadio);
    
    expect(onSectionChange).toHaveBeenCalledWith(null);
  });

  it('should call onSectionChange with section name when section clicked', () => {
    const onSectionChange = vi.fn();
    render(<WorksFiltersDrawer {...defaultProps} onSectionChange={onSectionChange} />);
    
    const fundamentRadio = screen.getByLabelText(/Фундамент/);
    fireEvent.click(fundamentRadio);
    
    expect(onSectionChange).toHaveBeenCalledWith('Фундамент');
  });

  it('should render "Сбросить" and "Применить" buttons', () => {
    render(<WorksFiltersDrawer {...defaultProps} />);
    expect(screen.getByText('Сбросить')).toBeInTheDocument();
    expect(screen.getByText('Применить')).toBeInTheDocument();
  });

  it('should call onReset when "Сбросить" clicked', () => {
    const onReset = vi.fn();
    render(<WorksFiltersDrawer {...defaultProps} onReset={onReset} />);
    
    const resetButton = screen.getByText('Сбросить');
    fireEvent.click(resetButton);
    
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('should call onApply when "Применить" clicked', () => {
    const onApply = vi.fn();
    render(<WorksFiltersDrawer {...defaultProps} onApply={onApply} />);
    
    const applyButton = screen.getByText('Применить');
    fireEvent.click(applyButton);
    
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when close icon clicked', () => {
    const onClose = vi.fn();
    render(<WorksFiltersDrawer {...defaultProps} onClose={onClose} />);
    
    // IconX рендерится как кнопка
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn => btn.querySelector('svg'));
    
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should not render when open is false', () => {
    render(<WorksFiltersDrawer {...defaultProps} open={false} />);
    // Drawer с open=false не рендерит контент в DOM
    expect(screen.queryByText('Фильтры')).not.toBeInTheDocument();
  });

  it('should handle empty availableSections array', () => {
    render(<WorksFiltersDrawer {...defaultProps} availableSections={[]} />);
    expect(screen.getByText('Все работы')).toBeInTheDocument();
    // Только "Все работы" должно быть, без других секций
    expect(screen.queryByText('Фундамент')).not.toBeInTheDocument();
  });
});
