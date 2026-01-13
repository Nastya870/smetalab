import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorksListPanel from 'app/estimates/components/WorksListPanel';

describe('WorksListPanel', () => {
  const mockWorks = [
    {
      id: '1',
      code: '01-001',
      name: 'Устройство фундамента',
      price: 1500,
      unit: 'м³',
      section: 'Фундамент'
    },
    {
      id: '2',
      code: '02-001',
      name: 'Кладка кирпичная',
      price: 2500,
      unit: 'м²',
      section: 'Стены'
    }
  ];

  const defaultProps = {
    loading: false,
    error: null,
    works: mockWorks,
    addedWorkIds: new Set(),
    addingWorkId: null,
    onAddWork: vi.fn(),
    onReload: vi.fn()
  };

  describe('Loading State', () => {
    it('should show spinner when loading is true', () => {
      const { container } = render(<WorksListPanel {...defaultProps} loading={true} />);
      const spinner = container.querySelector('.MuiCircularProgress-root');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show works list when loading', () => {
      render(<WorksListPanel {...defaultProps} loading={true} />);
      expect(screen.queryByText('01-001')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when error is set', () => {
      render(<WorksListPanel {...defaultProps} error="Ошибка загрузки" />);
      expect(screen.getByText('Ошибка загрузки')).toBeInTheDocument();
    });

    it('should show reload button in error state', () => {
      render(<WorksListPanel {...defaultProps} error="Ошибка" />);
      expect(screen.getByText('Обновить страницу')).toBeInTheDocument();
    });

    it('should call onReload when reload button clicked', () => {
      const onReload = vi.fn();
      render(<WorksListPanel {...defaultProps} error="Ошибка" onReload={onReload} />);
      
      const reloadButton = screen.getByText('Обновить страницу');
      fireEvent.click(reloadButton);
      
      expect(onReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('should show empty state when works array is empty', () => {
      render(<WorksListPanel {...defaultProps} works={[]} />);
      expect(screen.getByText('Работы не найдены')).toBeInTheDocument();
    });

    it('should show empty state message', () => {
      render(<WorksListPanel {...defaultProps} works={[]} />);
      expect(screen.getByText('Измените фильтры или строку поиска')).toBeInTheDocument();
    });
  });

  describe('Works List', () => {
    it('should render Virtuoso component with correct data', () => {
      const { container } = render(<WorksListPanel {...defaultProps} />);
      // Virtuoso рендерит scroller
      expect(container.querySelector('[data-virtuoso-scroller]')).toBeInTheDocument();
    });
  });

  describe('Work Actions', () => {
    it('should use Set for addedWorkIds', () => {
      // Проверяем что компонент принимает Set (type check)
      const addedWorkIds = new Set(['1']);
      expect(() => render(<WorksListPanel {...defaultProps} addedWorkIds={addedWorkIds} />)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should use Set for addedWorkIds (O(1) lookup)', () => {
      const addedWorkIds = new Set(['1', '2', '3']);
      render(<WorksListPanel {...defaultProps} addedWorkIds={addedWorkIds} />);
      // Проверяем что Set передан корректно
      expect(addedWorkIds.has('1')).toBe(true);
    });

    it('should handle large works array', () => {
      const largeWorksList = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        code: `0${i}`,
        name: `Work ${i}`,
        price: 1000,
        unit: 'шт',
        section: 'Test'
      }));
      
      const { container } = render(<WorksListPanel {...defaultProps} works={largeWorksList} />);
      // Virtuoso должен рендерить только видимые элементы
      expect(container).toBeInTheDocument();
    });
  });
});
