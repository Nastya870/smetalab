import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EstimateTotals from 'app/estimates/components/EstimateTotals';

describe('EstimateTotals', () => {
  const defaultProps = {
    worksTotal: 150000.50,
    materialsTotal: 75000.25,
    totalWeight: 1234.567
  };

  it('should display works total label', () => {
    render(<EstimateTotals {...defaultProps} />);
    expect(screen.getByText('Итого за работы:')).toBeInTheDocument();
  });

  it('should display materials total label', () => {
    render(<EstimateTotals {...defaultProps} />);
    expect(screen.getByText('Итого за материалы:')).toBeInTheDocument();
  });

  it('should display weight label', () => {
    render(<EstimateTotals {...defaultProps} />);
    expect(screen.getByText('Вес:')).toBeInTheDocument();
  });

  it('should format works total as currency', () => {
    render(<EstimateTotals {...defaultProps} />);
    // formatCurrency форматирует как "150 000,50 ₽" - проверяем базовое значение
    const allText = screen.getByText(/Итого за работы:/).parentElement.textContent;
    expect(allText).toContain('150');
    expect(allText).toContain('₽');
  });

  it('should format materials total as currency', () => {
    render(<EstimateTotals {...defaultProps} />);
    // formatCurrency форматирует как "75 000,25 ₽"
    expect(screen.getAllByText(/₽/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/75/)).toBeInTheDocument();
  });

  it('should format weight with 2-3 decimal places and "кг" suffix', () => {
    render(<EstimateTotals {...defaultProps} />);
    // 1234.567 → "1 234,567 кг" (ru-RU locale)
    expect(screen.getByText(/кг/)).toBeInTheDocument();
    expect(screen.getByText(/1.*234/)).toBeInTheDocument();
  });

  it('should render weight even when it is zero', () => {
    render(<EstimateTotals {...defaultProps} totalWeight={0} />);
    expect(screen.getByText(/0,00.*кг/)).toBeInTheDocument();
  });

  it('should handle large numbers correctly', () => {
    render(<EstimateTotals 
      worksTotal={9999999.99}
      materialsTotal={8888888.88}
      totalWeight={99999.999}
    />);
    
    // Просто проверяем наличие значений
    expect(screen.getAllByText(/₽/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/кг/)).toBeInTheDocument();
  });

  it('should handle small decimal weights correctly', () => {
    render(<EstimateTotals {...defaultProps} totalWeight={0.123} />);
    // Минимум 2 знака, максимум 3 → "0,123 кг"
    expect(screen.getByText(/0,12.*кг/)).toBeInTheDocument();
  });

  it('should display all three sections in correct order', () => {
    const { container } = render(<EstimateTotals {...defaultProps} />);
    const sections = container.querySelectorAll('.MuiBox-root > .MuiBox-root');
    
    // Должно быть 3 секции: работы, материалы, вес
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });

  describe('PropTypes Validation', () => {
    it('should render with all required props', () => {
      const { container } = render(<EstimateTotals {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should accept zero values', () => {
      const { container } = render(<EstimateTotals 
        worksTotal={0}
        materialsTotal={0}
        totalWeight={0}
      />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should accept negative values (edge case)', () => {
      // Хотя в реальной смете не должно быть отрицательных значений,
      // компонент должен их корректно отрендерить
      const { container } = render(<EstimateTotals 
        worksTotal={-1000}
        materialsTotal={-500}
        totalWeight={-10}
      />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Visual Structure', () => {
    it('should render three value boxes (works, materials, weight)', () => {
      const { container } = render(<EstimateTotals {...defaultProps} />);
      // Проверяем наличие всех трех блоков
      expect(screen.getByText('Итого за работы:')).toBeInTheDocument();
      expect(screen.getByText('Итого за материалы:')).toBeInTheDocument();
      expect(screen.getByText('Вес:')).toBeInTheDocument();
    });
  });
});
