import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EstimateTableSection from 'app/estimates/components/EstimateTableSection';

// Mock компонентов WorkRow и MaterialRow
vi.mock('app/estimates/components/WorkRow', () => ({
  default: ({ item, sectionIndex, itemIndex }) => (
    <tr data-testid={`work-row-${sectionIndex}-${itemIndex}`}>
      <td>{item.code}</td>
      <td>{item.name}</td>
    </tr>
  )
}));

vi.mock('app/estimates/components/MaterialRow', () => ({
  default: ({ material, sectionIndex, itemIndex, matIndex }) => (
    <tr data-testid={`material-row-${sectionIndex}-${itemIndex}-${matIndex}`}>
      <td>{material.code}</td>
      <td>{material.name}</td>
    </tr>
  )
}));

// Mock callbacks
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

// Mock данные секции
const mockSection = {
  id: 'section-1',
  items: [
    {
      id: 'work-1',
      code: 'W001',
      name: 'Работа 1',
      materials: [
        { id: 'mat-1', code: 'M001', name: 'Материал 1' }
      ]
    }
  ]
};

describe('EstimateTableSection', () => {
  it('should render work rows for all items in section', () => {
    const { container } = render(
      <table>
        <tbody>
          <EstimateTableSection
            section={mockSection}
            sectionIndex={0}
            {...mockCallbacks}
          />
        </tbody>
      </table>
    );

    expect(screen.getByTestId('work-row-0-0')).toBeInTheDocument();
    expect(screen.getByText('W001')).toBeInTheDocument();
    expect(screen.getByText('Работа 1')).toBeInTheDocument();
  });

  it('should render material rows when work has materials', () => {
    const { container } = render(
      <table>
        <tbody>
          <EstimateTableSection
            section={mockSection}
            sectionIndex={0}
            {...mockCallbacks}
          />
        </tbody>
      </table>
    );

    expect(screen.getByTestId('material-row-0-0-0')).toBeInTheDocument();
    expect(screen.getByText('M001')).toBeInTheDocument();
    expect(screen.getByText('Материал 1')).toBeInTheDocument();
  });

  it('should render multiple work items', () => {
    const sectionWithMultipleItems = {
      id: 'section-2',
      items: [
        { id: 'work-1', code: 'W001', name: 'Работа 1', materials: [] },
        { id: 'work-2', code: 'W002', name: 'Работа 2', materials: [] }
      ]
    };

    render(
      <table>
        <tbody>
          <EstimateTableSection
            section={sectionWithMultipleItems}
            sectionIndex={1}
            {...mockCallbacks}
          />
        </tbody>
      </table>
    );

    expect(screen.getByTestId('work-row-1-0')).toBeInTheDocument();
    expect(screen.getByTestId('work-row-1-1')).toBeInTheDocument();
    expect(screen.getByText('W001')).toBeInTheDocument();
    expect(screen.getByText('W002')).toBeInTheDocument();
  });

  it('should handle section with no items', () => {
    const emptySection = {
      id: 'section-3',
      items: []
    };

    const { container } = render(
      <table>
        <tbody>
          <EstimateTableSection
            section={emptySection}
            sectionIndex={2}
            {...mockCallbacks}
          />
        </tbody>
      </table>
    );

    const workRows = container.querySelectorAll('[data-testid^="work-row"]');
    expect(workRows.length).toBe(0);
  });

  it('should handle section with undefined items', () => {
    const sectionWithoutItems = {
      id: 'section-4'
    };

    const { container } = render(
      <table>
        <tbody>
          <EstimateTableSection
            section={sectionWithoutItems}
            sectionIndex={3}
            {...mockCallbacks}
          />
        </tbody>
      </table>
    );

    const workRows = container.querySelectorAll('[data-testid^="work-row"]');
    expect(workRows.length).toBe(0);
  });

  it('should render multiple materials for single work', () => {
    const sectionWithMultipleMaterials = {
      id: 'section-5',
      items: [
        {
          id: 'work-1',
          code: 'W001',
          name: 'Работа 1',
          materials: [
            { id: 'mat-1', code: 'M001', name: 'Материал 1' },
            { id: 'mat-2', code: 'M002', name: 'Материал 2' },
            { id: 'mat-3', code: 'M003', name: 'Материал 3' }
          ]
        }
      ]
    };

    render(
      <table>
        <tbody>
          <EstimateTableSection
            section={sectionWithMultipleMaterials}
            sectionIndex={0}
            {...mockCallbacks}
          />
        </tbody>
      </table>
    );

    expect(screen.getByTestId('material-row-0-0-0')).toBeInTheDocument();
    expect(screen.getByTestId('material-row-0-0-1')).toBeInTheDocument();
    expect(screen.getByTestId('material-row-0-0-2')).toBeInTheDocument();
    expect(screen.getByText('M001')).toBeInTheDocument();
    expect(screen.getByText('M002')).toBeInTheDocument();
    expect(screen.getByText('M003')).toBeInTheDocument();
  });
});
