import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WorksTabs from 'app/estimates/components/WorksTabs';

describe('WorksTabs', () => {
  const defaultProps = {
    value: 'global',
    onChange: vi.fn()
  };

  it('should render both tabs', () => {
    render(<WorksTabs {...defaultProps} />);
    expect(screen.getByText('Глобальные работы')).toBeInTheDocument();
    expect(screen.getByText('Мои работы')).toBeInTheDocument();
  });

  it('should highlight global tab when value is "global"', () => {
    render(<WorksTabs {...defaultProps} value="global" />);
    const globalButton = screen.getByText('Глобальные работы').closest('button');
    const tenantButton = screen.getByText('Мои работы').closest('button');
    
    // Global должен быть активным (цвет #3B82F6)
    expect(globalButton).toHaveStyle({ color: '#3B82F6' });
    // Tenant должен быть неактивным (цвет #6B7280)
    expect(tenantButton).toHaveStyle({ color: '#6B7280' });
  });

  it('should highlight tenant tab when value is "tenant"', () => {
    render(<WorksTabs {...defaultProps} value="tenant" />);
    const globalButton = screen.getByText('Глобальные работы').closest('button');
    const tenantButton = screen.getByText('Мои работы').closest('button');
    
    expect(globalButton).toHaveStyle({ color: '#6B7280' });
    expect(tenantButton).toHaveStyle({ color: '#3B82F6' });
  });

  it('should call onChange with "global" when global tab clicked', () => {
    const onChange = vi.fn();
    render(<WorksTabs {...defaultProps} value="tenant" onChange={onChange} />);
    
    const globalButton = screen.getByText('Глобальные работы');
    fireEvent.click(globalButton);
    
    expect(onChange).toHaveBeenCalledWith('global');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('should call onChange with "tenant" when tenant tab clicked', () => {
    const onChange = vi.fn();
    render(<WorksTabs {...defaultProps} value="global" onChange={onChange} />);
    
    const tenantButton = screen.getByText('Мои работы');
    fireEvent.click(tenantButton);
    
    expect(onChange).toHaveBeenCalledWith('tenant');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('should allow clicking already active tab', () => {
    const onChange = vi.fn();
    render(<WorksTabs {...defaultProps} value="global" onChange={onChange} />);
    
    const globalButton = screen.getByText('Глобальные работы');
    fireEvent.click(globalButton);
    
    expect(onChange).toHaveBeenCalledWith('global');
  });
});
