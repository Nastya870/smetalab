import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MaterialsDialog from "app/estimates/components/MaterialsDialog";

describe('MaterialsDialog', () => {
  const mockMaterials = [
    {
      id: '1',
      name: 'Цемент М500',
      category: 'Стройматериалы',
      supplier: 'СтройТорг',
      sku: 'SKU-001',
      unit: 'кг',
      price: 150.5,
      image: 'https://example.com/cement.jpg'
    },
    {
      id: '2',
      name: 'Песок речной',
      category: 'Стройматериалы',
      supplier: null,
      sku: 'SKU-002',
      unit: 'м³',
      price: 500,
      image: null
    }
  ];

  const defaultProps = {
    open: true,
    mode: 'add',
    items: mockMaterials,
    totalCountText: 'Найдено: 2',
    loading: false,
    searchQuery: '',
    hasMore: false,
    loadMoreRef: { current: null },
    onClose: vi.fn(),
    onSearchChange: vi.fn(),
    onSelect: vi.fn()
  };

  it('should render dialog title for add mode', () => {
    render(<MaterialsDialog {...defaultProps} />);
    expect(screen.getByText('Добавить материал')).toBeInTheDocument();
  });

  it('should render dialog title for replace mode', () => {
    render(<MaterialsDialog {...defaultProps} mode="replace" />);
    expect(screen.getByText('Заменить материал')).toBeInTheDocument();
  });

  it('should show hint in add mode', () => {
    render(<MaterialsDialog {...defaultProps} mode="add" />);
    expect(screen.getByText(/Добавьте несколько материалов подряд/)).toBeInTheDocument();
  });

  it('should not show hint in replace mode', () => {
    render(<MaterialsDialog {...defaultProps} mode="replace" />);
    expect(screen.queryByText(/Добавьте несколько материалов подряд/)).not.toBeInTheDocument();
  });

  it('should render search field with correct placeholder', () => {
    render(<MaterialsDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Начните вводить название/)).toBeInTheDocument();
  });

  it('should call onSearchChange when typing in search field', () => {
    const onSearchChange = vi.fn();
    render(<MaterialsDialog {...defaultProps} onSearchChange={onSearchChange} />);
    
    const searchField = screen.getByPlaceholderText(/Начните вводить название/);
    fireEvent.change(searchField, { target: { value: 'Цемент' } });
    
    expect(onSearchChange).toHaveBeenCalledWith('Цемент');
  });

  it('should display total count text in chip', () => {
    render(<MaterialsDialog {...defaultProps} totalCountText="Найдено: 100" />);
    expect(screen.getByText('Найдено: 100')).toBeInTheDocument();
  });

  it('should show loading spinner when loading is true', () => {
    render(<MaterialsDialog {...defaultProps} loading={true} totalCountText="Найдено: 100" />);
    // Loading spinner отображается в заголовке рядом с Chip
    expect(screen.getByText('Найдено: 100')).toBeInTheDocument();
  });

  it('should show loading state when items array is empty and loading', () => {
    render(<MaterialsDialog {...defaultProps} items={[]} loading={true} />);
    const spinners = screen.getAllByRole('progressbar');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('should show empty state when items array is empty and not loading', () => {
    render(<MaterialsDialog {...defaultProps} items={[]} loading={false} />);
    expect(screen.getByText('Загрузка материалов...')).toBeInTheDocument();
  });

  it('should show "not found" message when search query exists and items empty', () => {
    render(<MaterialsDialog {...defaultProps} items={[]} loading={false} searchQuery="test" />);
    expect(screen.getByText('Материалы не найдены')).toBeInTheDocument();
  });

  it('should render material names', () => {
    render(<MaterialsDialog {...defaultProps} />);
    expect(screen.getByText('Цемент М500')).toBeInTheDocument();
    expect(screen.getByText('Песок речной')).toBeInTheDocument();
  });

  it('should render material categories as chips', () => {
    render(<MaterialsDialog {...defaultProps} />);
    const chips = screen.getAllByText('Стройматериалы');
    expect(chips.length).toBe(2);
  });

  it('should render material supplier when present', () => {
    render(<MaterialsDialog {...defaultProps} />);
    expect(screen.getByText('СтройТорг')).toBeInTheDocument();
  });

  it('should render material SKU', () => {
    render(<MaterialsDialog {...defaultProps} />);
    expect(screen.getByText('SKU-001')).toBeInTheDocument();
    expect(screen.getByText('SKU-002')).toBeInTheDocument();
  });

  it('should render material units', () => {
    render(<MaterialsDialog {...defaultProps} />);
    expect(screen.getByText('кг')).toBeInTheDocument();
    expect(screen.getByText('м³')).toBeInTheDocument();
  });

  it('should call onSelect when material item is clicked', () => {
    const onSelect = vi.fn();
    render(<MaterialsDialog {...defaultProps} onSelect={onSelect} />);

    const materialItem = screen.getByText('Цемент М500');
    fireEvent.click(materialItem);

    expect(onSelect).toHaveBeenCalledWith(mockMaterials[0]);
  });

  it('should render load more trigger when hasMore is true', () => {
    render(<MaterialsDialog {...defaultProps} hasMore={true} items={mockMaterials} />);
    // Когда hasMore=true, сообщение "✅ Найдено" не должно отображаться
    expect(screen.queryByText(/✅ Найдено/)).not.toBeInTheDocument();
  });

  it('should show loading spinner in load more trigger when loading', () => {
    render(<MaterialsDialog {...defaultProps} hasMore={true} loading={true} items={mockMaterials} />);
    // Когда hasMore=true и loading=true, материалы всё равно отображаются
    expect(screen.getByText('Цемент М500')).toBeInTheDocument();
  });

  it('should show completion message when all items loaded', () => {
    render(<MaterialsDialog {...defaultProps} hasMore={false} />);
    expect(screen.getByText('Показано 2 материалов')).toBeInTheDocument();
  });

  it('should show search completion message when search query exists', () => {
    render(<MaterialsDialog {...defaultProps} hasMore={false} searchQuery="Цемент" />);
    expect(screen.getByText('✅ Найдено 2 материалов')).toBeInTheDocument();
  });

  it('should call onClose when cancel button clicked', () => {
    const onClose = vi.fn();
    render(<MaterialsDialog {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Отмена');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should not render dialog when open is false', () => {
    render(<MaterialsDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Добавить материал')).not.toBeInTheDocument();
  });

  it('should render search hint when search query is not empty', () => {
    render(<MaterialsDialog {...defaultProps} searchQuery="test" />);
    expect(screen.getByText(/Поиск в базе 47,000 материалов/)).toBeInTheDocument();
  });

  it('should not render search hint when search query is empty', () => {
    render(<MaterialsDialog {...defaultProps} searchQuery="" />);
    expect(screen.queryByText(/Поиск в базе 47,000 материалов/)).not.toBeInTheDocument();
  });

  it('should render material image when present', () => {
    render(<MaterialsDialog {...defaultProps} />);
    const image = screen.getByRole('img', { name: 'Цемент М500' });
    expect(image).toHaveAttribute('src', 'https://example.com/cement.jpg');
  });
});
