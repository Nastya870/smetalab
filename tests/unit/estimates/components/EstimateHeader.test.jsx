import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EstimateHeader from 'app/estimates/components/EstimateHeader';

describe('EstimateHeader', () => {
  const defaultProps = {
    estimateName: 'Смета от 01.01.2026',
    estimateIdShort: '12345678',
    sidebarVisible: false,
    saving: false,
    exportingExcel: false,
    disableSave: false,
    disableTemplate: false,
    disableCoefficient: false,
    disableClear: false,
    disableExport: false,
    onToggleSidebar: vi.fn(),
    onSave: vi.fn(),
    onSaveAsTemplate: vi.fn(),
    onOpenCoefficient: vi.fn(),
    onClear: vi.fn(),
    onExportExcel: vi.fn()
  };

  it('should render estimate name', () => {
    render(<EstimateHeader {...defaultProps} />);
    expect(screen.getByText(/Смета: Смета от 01.01.2026/)).toBeInTheDocument();
  });

  it('should render estimate ID', () => {
    render(<EstimateHeader {...defaultProps} />);
    expect(screen.getByText(/#12345678/)).toBeInTheDocument();
  });

  it('should render "Без названия" when estimateName is empty', () => {
    render(<EstimateHeader {...defaultProps} estimateName="" />);
    expect(screen.getByText(/Смета: Без названия/)).toBeInTheDocument();
  });

  it('should render "новая" in ID when estimateIdShort is "новая"', () => {
    render(<EstimateHeader {...defaultProps} estimateIdShort="новая" />);
    expect(screen.getByText(/#новая/)).toBeInTheDocument();
  });

  describe('Toggle Sidebar Button', () => {
    it('should show "Режим расчёта" when sidebar is hidden', () => {
      render(<EstimateHeader {...defaultProps} sidebarVisible={false} />);
      expect(screen.getByText('Режим расчёта')).toBeInTheDocument();
    });

    it('should show "Режим просмотра" when sidebar is visible', () => {
      render(<EstimateHeader {...defaultProps} sidebarVisible={true} />);
      expect(screen.getByText('Режим просмотра')).toBeInTheDocument();
    });

    it('should call onToggleSidebar when clicked', () => {
      const onToggleSidebar = vi.fn();
      render(<EstimateHeader {...defaultProps} onToggleSidebar={onToggleSidebar} />);

      const button = screen.getByText('Режим расчёта');
      fireEvent.click(button);

      expect(onToggleSidebar).toHaveBeenCalledTimes(1);
    });
  });

  describe('Save Button', () => {
    it('should render "Сохранить" text by default', () => {
      render(<EstimateHeader {...defaultProps} />);
      expect(screen.getByText('Сохранить')).toBeInTheDocument();
    });

    it('should render "Сохранение..." text when saving', () => {
      render(<EstimateHeader {...defaultProps} saving={true} />);
      expect(screen.getByText('Сохранение...')).toBeInTheDocument();
    });

    it('should call onSave when clicked', () => {
      const onSave = vi.fn();
      render(<EstimateHeader {...defaultProps} onSave={onSave} />);

      const button = screen.getByText('Сохранить');
      fireEvent.click(button);

      expect(onSave).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disableSave is true', () => {
      render(<EstimateHeader {...defaultProps} disableSave={true} />);
      const button = screen.getByText('Сохранить').closest('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Template Button', () => {
    it('should call onSaveAsTemplate when clicked', () => {
      const onSaveAsTemplate = vi.fn();
      render(<EstimateHeader {...defaultProps} onSaveAsTemplate={onSaveAsTemplate} />);

      const button = screen.getByText('Шаблон');
      fireEvent.click(button);

      expect(onSaveAsTemplate).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disableTemplate is true', () => {
      render(<EstimateHeader {...defaultProps} disableTemplate={true} />);
      const button = screen.getByText('Шаблон').closest('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Coefficient Button', () => {
    it('should call onOpenCoefficient when clicked', () => {
      const onOpenCoefficient = vi.fn();
      render(<EstimateHeader {...defaultProps} onOpenCoefficient={onOpenCoefficient} />);

      const button = screen.getByText('Коэффициент');
      fireEvent.click(button);

      expect(onOpenCoefficient).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disableCoefficient is true', () => {
      render(<EstimateHeader {...defaultProps} disableCoefficient={true} />);
      const button = screen.getByText('Коэффициент').closest('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Clear Button', () => {
    it('should call onClear when clicked', () => {
      const onClear = vi.fn();
      render(<EstimateHeader {...defaultProps} onClear={onClear} />);

      const button = screen.getByText('Очистить');
      fireEvent.click(button);

      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disableClear is true', () => {
      render(<EstimateHeader {...defaultProps} disableClear={true} />);
      const button = screen.getByText('Очистить').closest('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Export Button', () => {
    it('should render "Excel" text by default', () => {
      render(<EstimateHeader {...defaultProps} />);
      expect(screen.getByText('Excel')).toBeInTheDocument();
    });

    it('should render "Экспорт..." text when exporting', () => {
      render(<EstimateHeader {...defaultProps} exportingExcel={true} />);
      expect(screen.getByText('Экспорт...')).toBeInTheDocument();
    });

    it('should call onExportExcel when clicked', () => {
      const onExportExcel = vi.fn();
      render(<EstimateHeader {...defaultProps} onExportExcel={onExportExcel} />);

      const button = screen.getByText('Excel');
      fireEvent.click(button);

      expect(onExportExcel).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disableExport is true', () => {
      render(<EstimateHeader {...defaultProps} disableExport={true} />);
      const button = screen.getByText('Excel').closest('button');
      expect(button).toBeDisabled();
    });

    it('should be disabled when exportingExcel is true', () => {
      render(<EstimateHeader {...defaultProps} exportingExcel={true} disableExport={true} />);
      const button = screen.getByText('Экспорт...').closest('button');
      expect(button).toBeDisabled();
    });
  });

  describe('PropTypes Validation', () => {
    it('should render with all required props', () => {
      const { container } = render(<EstimateHeader {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
