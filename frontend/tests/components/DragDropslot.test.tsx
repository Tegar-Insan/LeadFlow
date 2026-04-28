/**
 * DragDropSlot.test.jsx
 * TC007_05 — Drag and drop → content moves to new date
 */
import { render, screen, fireEvent, createEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/Schedule/ScheduleQueueCard', () => ({
  default: ({ schedule }) => (
    <div data-testid="schedule-card">
      {schedule.custom_caption || schedule.title}
    </div>
  ),
}));

import DragDropSlot from '../../src/components/Schedule/DragDropSlot';

const makeCell = (overrides = {}) => ({
  day: 25, iso: '2026-04-25', isCurrentMonth: true, isToday: false, ...overrides,
});

// jsdom doesn't implement dataTransfer — helper creates a proper drag event
function makeDragEvent(type, el, dataTransferOverrides = {}) {
  const evt = createEvent[type](el);
  Object.defineProperty(evt, 'dataTransfer', {
    value: { dropEffect: '', getData: () => '', ...dataTransferOverrides },
  });
  return evt;
}

describe('DragDropSlot', () => {
  // TC007_01 — renders the day number
  it('renders the day number', () => {
    render(<DragDropSlot cell={makeCell()} />);
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  // TC007_01 — today cell gets today indicator styling
  it('applies today style when cell.isToday is true', () => {
    render(<DragDropSlot cell={makeCell({ isToday: true, day: 9 })} />);
    expect(screen.getByText('9').className).toContain('bg-brand');
  });

  // TC007 — onDayClick fires when the cell background is clicked
  it('calls onDayClick with the cell iso when the cell is clicked', () => {
    const onDayClick = vi.fn();
    const { container } = render(<DragDropSlot cell={makeCell()} onDayClick={onDayClick} />);
    fireEvent.click(container.firstChild);
    expect(onDayClick).toHaveBeenCalledWith('2026-04-25');
  });

  // TC007 — schedule cards render inside the slot
  it('renders schedule cards for each schedule passed', () => {
    const schedules = [
      { id: '1', title: 'Post A', status: 'scheduled' },
      { id: '2', title: 'Post B', status: 'draft' },
    ];
    render(<DragDropSlot cell={makeCell()} schedules={schedules} onCardClick={vi.fn()} />);
    expect(screen.getByText('Post A')).toBeInTheDocument();
    expect(screen.getByText('Post B')).toBeInTheDocument();
  });

  // TC007 — card click calls onCardClick, NOT onDayClick
  it('calls onCardClick (not onDayClick) when a card is clicked', () => {
    const onCardClick = vi.fn();
    const onDayClick  = vi.fn();
    const schedules   = [{ id: '1', title: 'Post A', status: 'scheduled' }];
    render(
      <DragDropSlot cell={makeCell()} schedules={schedules}
        onCardClick={onCardClick} onDayClick={onDayClick} />
    );
    fireEvent.click(screen.getByTestId('schedule-card'));
    expect(onCardClick).toHaveBeenCalledWith(schedules[0]);
    expect(onDayClick).not.toHaveBeenCalled();
  });

  // TC007_05 — drag-over applies highlight class
  it('shows drag-over highlight when an item is dragged over', () => {
    const { container } = render(<DragDropSlot cell={makeCell()} onDrop={vi.fn()} />);
    const slot = container.firstChild as HTMLElement;
    fireEvent(slot, makeDragEvent('dragOver', slot));
    expect(slot.className).toContain('bg-brand');
  });

  // TC007_05 — onDrop fires with scheduleId and iso
  it('calls onDrop with scheduleId and iso when a card is dropped', () => {
    const onDrop = vi.fn();
    const { container } = render(<DragDropSlot cell={makeCell()} onDrop={onDrop} />);
    const slot = container.firstChild;
    fireEvent(slot, makeDragEvent('dragOver', slot));
    fireEvent(slot, makeDragEvent('drop', slot, {
      getData: (key) => key === 'scheduleId' ? '42' : '',
    }));
    expect(onDrop).toHaveBeenCalledWith('42', '2026-04-25');
  });

  // TC007 — overflow count label when schedules exceed maxVisible
  it('shows overflow count when schedules exceed maxVisible', () => {
    const schedules = Array.from({ length: 5 }, (_, i) => ({
      id: String(i + 1), title: `Post ${i + 1}`, status: 'draft',
    }));
    render(<DragDropSlot cell={makeCell()} schedules={schedules} maxVisible={3} />);
    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });
});
