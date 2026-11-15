import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BillLines } from './plan-option';

const items = [
  { itemId: 'a', name: 'Burger', priceNgwee: 12000, qty: 2, role: 'main' },
  { itemId: 'b', name: 'Coke', priceNgwee: 2500, qty: 2, role: 'drink' },
];

describe('BillLines', () => {
  it('shows each line and the server-provided total', () => {
    render(<BillLines items={items} total={29000} />);
    expect(screen.getByText('2 × Burger')).toBeInTheDocument();
    expect(screen.getByText('K240')).toBeInTheDocument();
    expect(screen.getByText('K290')).toBeInTheDocument();
    expect(screen.queryByText(/over budget/)).toBeNull();
  });
  it('flags how far over budget an option is', () => {
    render(<BillLines items={items} total={29000} over={4000} />);
    expect(screen.getByText('K40 over budget')).toBeInTheDocument();
  });
});
