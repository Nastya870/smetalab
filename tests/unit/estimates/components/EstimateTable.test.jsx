import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EstimateTable from 'app/estimates/components/EstimateTable';

describe('EstimateTable', () => {
  const mockCallbacks = {
    onWorkQuantityChange: vi.fn(),
    onWorkQuantityBlur: vi.fn(),
    onWorkPriceChange: vi.fn(),
    onWorkPriceBlur: vi.fn(),
    onUpdateWorkPrice: vi.fn(),
    onAddMaterial: vi.fn(),
    onDeleteWork: vi.fn(),
    onMaterialQuantityChange: vi.fn(),
    onMaterialQuantityBlur: vi.fn(),
    onMaterialConsumptionChange: vi.fn(),
    onMaterialConsumptionBlur: vi.fn(),
    onReplaceMaterial: vi.fn(),
    onDeleteMaterial: vi.fn()
  };

  const mockEstimateData = {
    sections: [
      {
        id: 'section-1',
        items: [
          {
            id: 'work-1',
            code: '01-001',
            name: 'Работа 1',
            unit: 'м²',
            quantity: 10,
            price: 100,
            total: 1000,
            materials: [
              {
                id: 'mat-1',
                name: 'Материал 1',
                unit: 'кг',
                quantity: 5,
                price: 50,
                total: 250,
                consumption: 0.5
              }
            ]
          }
        ]
      }
    ]
  };

  it('should render table headers', () => {
    render(<EstimateTable {...mockCallbacks} sortedEstimateData={mockEstimateData} />);
    
    expect(screen.getByText('Код')).toBeInTheDocument();
    expect(screen.getByText('Наименование')).toBeInTheDocument();
    expect(screen.getByText('Фото')).toBeInTheDocument();
    expect(screen.getByText('Ед.')).toBeInTheDocument();
    expect(screen.getByText('Кол-во')).toBeInTheDocument();
    expect(screen.getByText('Цена')).toBeInTheDocument();
    expect(screen.getByText('Сумма')).toBeInTheDocument();
    expect(screen.getByText('Расход')).toBeInTheDocument();
    expect(screen.getByText('Действия')).toBeInTheDocument();
  });

  it('should render sections and items', () => {
    render(<EstimateTable {...mockCallbacks} sortedEstimateData={mockEstimateData} />);
    
    // Проверяем, что WorkRow рендерится (ищем код работы)
    expect(screen.getByText('01-001')).toBeInTheDocument();
    expect(screen.getByText('Работа 1')).toBeInTheDocument();
  });

  it('should handle empty sections', () => {
    const emptyData = { sections: [] };
    const { container } = render(<EstimateTable {...mockCallbacks} sortedEstimateData={emptyData} />);
    
    // Таблица должна рендериться, но без данных
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('should handle undefined sections', () => {
    const undefinedData = { sections: undefined };
    const { container } = render(<EstimateTable {...mockCallbacks} sortedEstimateData={undefinedData} />);
    
    // Таблица должна рендериться без ошибок
    expect(container.querySelector('table')).toBeInTheDocument();
  });

  it('should render sections with multiple items', () => {
    const multiItemData = {
      sections: [
        {
          id: 'section-1',
          items: [
            {
              id: 'work-1',
              code: '01-001',
              name: 'Работа 1',
              unit: 'м²',
              quantity: 10,
              price: 100,
              total: 1000,
              materials: []
            },
            {
              id: 'work-2',
              code: '01-002',
              name: 'Работа 2',
              unit: 'м³',
              quantity: 5,
              price: 200,
              total: 1000,
              materials: []
            }
          ]
        }
      ]
    };

    render(<EstimateTable {...mockCallbacks} sortedEstimateData={multiItemData} />);
    
    expect(screen.getByText('01-001')).toBeInTheDocument();
    expect(screen.getByText('01-002')).toBeInTheDocument();
    expect(screen.getByText('Работа 1')).toBeInTheDocument();
    expect(screen.getByText('Работа 2')).toBeInTheDocument();
  });

  it('should render TableContainer with correct styles', () => {
    const { container } = render(<EstimateTable {...mockCallbacks} sortedEstimateData={mockEstimateData} />);
    
    const tableContainer = container.querySelector('.MuiTableContainer-root');
    expect(tableContainer).toBeInTheDocument();
  });

  it('should render sticky header cells', () => {
    render(<EstimateTable {...mockCallbacks} sortedEstimateData={mockEstimateData} />);
    
    const headerCells = screen.getAllByRole('columnheader');
    expect(headerCells.length).toBe(9); // 9 колонок
  });
});
