import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { GoalsPage } from '../GoalsPage';

function renderGoals() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <GoalsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('GoalsPage', () => {
  it('renders active goals, milestones, and updates automatic progress on milestone toggle', async () => {
    const user = userEvent.setup();
    renderGoals();

    expect(await screen.findByText('Launch WAQTI SaaS v1')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Calendar, Habits & Goals/i }));
    expect(await screen.findByText('75%')).toBeInTheDocument();
  });
});
