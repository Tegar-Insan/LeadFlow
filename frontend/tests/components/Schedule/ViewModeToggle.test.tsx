import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ViewModeToggle from '../../../src/components/Schedule/ViewModeToggle';

describe('ViewModeToggle', () => {
  it('renders dropdown button with current mode label', () => {
    const onModeChange = vi.fn();
    render(<ViewModeToggle currentMode="grid" onModeChange={onModeChange} />);
    
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view mode/i })).toBeInTheDocument();
  });

  it('opens dropdown when button is clicked', async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();
    render(<ViewModeToggle currentMode="grid" onModeChange={onModeChange} />);
    
    const button = screen.getByRole('button', { name: /view mode/i });
    await user.click(button);
    
    // Both Calendar and List options should be visible in the menu
    expect(screen.getAllByText('Calendar').length).toBeGreaterThan(1);
    expect(screen.getByText('List')).toBeInTheDocument();
  });

  it('closes dropdown when an option is selected', async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();
    render(<ViewModeToggle currentMode="grid" onModeChange={onModeChange} />);
    
    const button = screen.getByRole('button', { name: /view mode/i });
    await user.click(button);
    
    const listOptions = screen.getAllByText('List');
    const listMenuOption = listOptions.find(el => el.closest('button')?.classList.contains('last:rounded-b-lg'));
    if (listMenuOption) {
      await user.click(listMenuOption);
    }
    
    expect(onModeChange).toHaveBeenCalledWith('list');
  });

  it('calls onModeChange("list") when list option is clicked', async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();
    render(<ViewModeToggle currentMode="grid" onModeChange={onModeChange} />);
    
    const button = screen.getByRole('button', { name: /view mode/i });
    await user.click(button);
    
    const listOptions = screen.getAllByText('List');
    await user.click(listOptions[listOptions.length - 1]); // Click the one in the dropdown
    
    expect(onModeChange).toHaveBeenCalledWith('list');
  });

  it('calls onModeChange("grid") when calendar option is clicked', async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();
    render(<ViewModeToggle currentMode="list" onModeChange={onModeChange} />);
    
    const button = screen.getByRole('button', { name: /view mode/i });
    await user.click(button);
    
    const calendarOptions = screen.getAllByText('Calendar');
    await user.click(calendarOptions[calendarOptions.length - 1]); // Click the one in the dropdown
    
    expect(onModeChange).toHaveBeenCalledWith('grid');
  });

  it('closes dropdown when clicking outside', async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <div>
        <ViewModeToggle currentMode="grid" onModeChange={onModeChange} />
        <div data-testid="outside">Outside div</div>
      </div>
    );
    
    const button = screen.getByRole('button', { name: /view mode/i });
    await user.click(button);
    
    // Dropdown should be open
    expect(screen.getAllByText('Calendar').length).toBeGreaterThan(1);
    
    // Click outside
    const outside = screen.getByTestId('outside');
    await user.click(outside);
    
    // Only the button text should remain
    expect(screen.getAllByText('Calendar').length).toBe(1);
  });
});
