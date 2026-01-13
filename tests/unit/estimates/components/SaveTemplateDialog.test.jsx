import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SaveTemplateDialog from "app/estimates/components/SaveTemplateDialog";

describe('SaveTemplateDialog', () => {
  const defaultFormData = {
    name: '',
    description: '',
    category: ''
  };

  const filledFormData = {
    name: 'Ремонт квартиры',
    description: 'Типовой ремонт двухкомнатной квартиры',
    category: 'Квартиры'
  };

  const defaultProps = {
    open: true,
    saving: false,
    formData: defaultFormData,
    onClose: vi.fn(),
    onChange: vi.fn(),
    onSave: vi.fn()
  };

  it('should render dialog title', () => {
    render(<SaveTemplateDialog {...defaultProps} />);
    expect(screen.getByText('Сохранить как шаблон')).toBeInTheDocument();
  });

  it('should render all form fields', () => {
    render(<SaveTemplateDialog {...defaultProps} />);
    expect(screen.getByLabelText(/Название шаблона/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Описание/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Категория/)).toBeInTheDocument();
  });

  it('should display form data values', () => {
    render(<SaveTemplateDialog {...defaultProps} formData={filledFormData} />);
    expect(screen.getByDisplayValue('Ремонт квартиры')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Типовой ремонт двухкомнатной квартиры')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Квартиры')).toBeInTheDocument();
  });

  it('should call onChange when name field changes', () => {
    const onChange = vi.fn();
    render(<SaveTemplateDialog {...defaultProps} onChange={onChange} />);
    
    const nameField = screen.getByLabelText(/Название шаблона/);
    fireEvent.change(nameField, { target: { value: 'Новое название' } });
    
    expect(onChange).toHaveBeenCalledWith('name', 'Новое название');
  });

  it('should call onChange when description field changes', () => {
    const onChange = vi.fn();
    render(<SaveTemplateDialog {...defaultProps} onChange={onChange} />);
    
    const descField = screen.getByLabelText(/Описание/);
    fireEvent.change(descField, { target: { value: 'Новое описание' } });
    
    expect(onChange).toHaveBeenCalledWith('description', 'Новое описание');
  });

  it('should call onChange when category field changes', () => {
    const onChange = vi.fn();
    render(<SaveTemplateDialog {...defaultProps} onChange={onChange} />);
    
    const categoryField = screen.getByLabelText(/Категория/);
    fireEvent.change(categoryField, { target: { value: 'Офисы' } });
    
    expect(onChange).toHaveBeenCalledWith('category', 'Офисы');
  });

  it('should render cancel and save buttons', () => {
    render(<SaveTemplateDialog {...defaultProps} />);
    expect(screen.getByText('Отмена')).toBeInTheDocument();
    expect(screen.getByText('Сохранить шаблон')).toBeInTheDocument();
  });

  it('should call onClose when cancel button clicked', () => {
    const onClose = vi.fn();
    render(<SaveTemplateDialog {...defaultProps} onClose={onClose} />);
    
    const cancelButton = screen.getByText('Отмена');
    fireEvent.click(cancelButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('should call onSave when save button clicked', () => {
    const onSave = vi.fn();
    render(<SaveTemplateDialog {...defaultProps} formData={filledFormData} onSave={onSave} />);
    
    const saveButton = screen.getByText('Сохранить шаблон');
    fireEvent.click(saveButton);
    
    expect(onSave).toHaveBeenCalled();
  });

  it('should disable save button when name is empty', () => {
    render(<SaveTemplateDialog {...defaultProps} formData={{ ...defaultFormData, name: '' }} />);
    
    const saveButton = screen.getByText('Сохранить шаблон').closest('button');
    expect(saveButton).toBeDisabled();
  });

  it('should disable save button when name is only whitespace', () => {
    render(<SaveTemplateDialog {...defaultProps} formData={{ ...defaultFormData, name: '   ' }} />);
    
    const saveButton = screen.getByText('Сохранить шаблон').closest('button');
    expect(saveButton).toBeDisabled();
  });

  it('should enable save button when name is filled', () => {
    render(<SaveTemplateDialog {...defaultProps} formData={filledFormData} />);
    
    const saveButton = screen.getByText('Сохранить шаблон').closest('button');
    expect(saveButton).not.toBeDisabled();
  });

  it('should disable save button when saving is true', () => {
    render(<SaveTemplateDialog {...defaultProps} formData={filledFormData} saving={true} />);
    
    const saveButton = screen.getByText('Сохранение...').closest('button');
    expect(saveButton).toBeDisabled();
  });

  it('should disable cancel button when saving is true', () => {
    render(<SaveTemplateDialog {...defaultProps} saving={true} />);
    
    const cancelButton = screen.getByText('Отмена').closest('button');
    expect(cancelButton).toBeDisabled();
  });

  it('should show "Сохранение..." text when saving is true', () => {
    render(<SaveTemplateDialog {...defaultProps} formData={filledFormData} saving={true} />);
    expect(screen.getByText('Сохранение...')).toBeInTheDocument();
  });

  it('should show loading spinner when saving is true', () => {
    render(<SaveTemplateDialog {...defaultProps} formData={filledFormData} saving={true} />);
    // Spinner отображается как startIcon в кнопке "Сохранение..."
    expect(screen.getByText('Сохранение...')).toBeInTheDocument();
  });

  it('should show error message when name field touched but empty', () => {
    render(<SaveTemplateDialog {...defaultProps} formData={{ ...defaultFormData, name: ' ' }} />);
    expect(screen.getByText('Название обязательно для заполнения')).toBeInTheDocument();
  });

  it('should not show error message when name field is pristine', () => {
    render(<SaveTemplateDialog {...defaultProps} formData={{ ...defaultFormData, name: '' }} />);
    expect(screen.queryByText('Название обязательно для заполнения')).not.toBeInTheDocument();
  });

  it('should render field placeholders', () => {
    render(<SaveTemplateDialog {...defaultProps} />);
    expect(screen.getByPlaceholderText('Например: Ремонт квартиры')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Краткое описание шаблона')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Например: Квартиры, Офисы')).toBeInTheDocument();
  });

  it('should render helper text for description field', () => {
    render(<SaveTemplateDialog {...defaultProps} />);
    expect(screen.getByText('Необязательно. Поможет быстрее найти шаблон.')).toBeInTheDocument();
  });

  it('should render helper text for category field', () => {
    render(<SaveTemplateDialog {...defaultProps} />);
    expect(screen.getByText('Для группировки шаблонов в списке.')).toBeInTheDocument();
  });

  it('should render "Дополнительно" section label', () => {
    render(<SaveTemplateDialog {...defaultProps} />);
    expect(screen.getByText('Дополнительно')).toBeInTheDocument();
  });

  it('should not render dialog when open is false', () => {
    render(<SaveTemplateDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Сохранить как шаблон')).not.toBeInTheDocument();
  });

  it('should not call onClose when clicking cancel during save', () => {
    const onClose = vi.fn();
    render(<SaveTemplateDialog {...defaultProps} onClose={onClose} saving={true} />);
    
    // Попытка закрыть через кнопку (она disabled)
    const cancelButton = screen.getByText('Отмена').closest('button');
    fireEvent.click(cancelButton);
    
    // onClose не должен вызваться, т.к. кнопка disabled
    expect(onClose).not.toHaveBeenCalled();
  });
});
