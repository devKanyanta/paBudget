import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MenuEditor, emptyMenu, fromExtracted, toPayload } from './menu-editor';

describe('menu editor', () => {
  it('drops blank rows and converts prices to ngwee', () => {
    const payload = toPayload([{ name: 'Mains', items: [{ name: 'Burger', price: '120' }, { name: '', price: '' }, { name: 'Wrap', price: '' }] }, { name: 'Empty', items: [{ name: '', price: '' }] }]);
    expect(payload).toEqual([{ name: 'Mains', items: [{ name: 'Burger', priceNgwee: 12000 }] }]);
  });
  it('round-trips an AI draft', () => {
    const m = fromExtracted({ sections: [{ name: 'Drinks', items: [{ name: 'Coke', priceNgwee: 2550 }] }] });
    expect(m[0].items[0].price).toBe('25.5');
    expect(toPayload(m)[0].items[0].priceNgwee).toBe(2550);
  });
  it('lets the user type and add items', () => {
    const onChange = vi.fn();
    render(<MenuEditor value={emptyMenu()} onChange={onChange} />);
    fireEvent.change(screen.getAllByLabelText('Item name')[0], { target: { value: 'Pizza' } });
    expect(onChange.mock.calls[0][0][0].items[0].name).toBe('Pizza');
    fireEvent.click(screen.getAllByText('＋ Add item')[0]);
    expect(onChange.mock.calls[1][0][0].items).toHaveLength(2);
  });
});
