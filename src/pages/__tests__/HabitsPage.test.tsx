import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { HabitsPage } from '../HabitsPage';

function renderHabits() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HabitsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('HabitsPage', () => {
  it('renders habits, analytics, and increments partial progress', async () => {
    const user = userEvent.setup();
    renderHabits();

    expect(await screen.findByText('Morning run')).toBeInTheDocument();
    expect(screen.getByText('Drink 8 glasses of water')).toBeInTheDocument();
    expect(screen.getByText('12-week consistency')).toBeInTheDocument();

    expect(screen.getByText('5/8')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+1' }));
    expect(await screen.findByText('6/8')).toBeInTheDocument();
  });
});
