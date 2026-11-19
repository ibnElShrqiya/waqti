import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CalendarPage } from '../CalendarPage';

function renderCalendar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CalendarPage', () => {
  it('renders week view, switches between day/week/month, and shows unscheduled tasks', async () => {
    const user = userEvent.setup();
    renderCalendar();

    expect(await screen.findByText('Team sync')).toBeInTheDocument();
    expect(screen.getByText('Unscheduled tasks')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Day' }));
    expect(screen.getByText('Team sync')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Month' }));
    expect(screen.getAllByText('Team sync').length).toBeGreaterThan(0);
  });
});
