import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { FocusPage } from '../FocusPage';

function renderFocus() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <FocusPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FocusPage', () => {
  it('renders Pomodoro timer, starts/pauses, and opens settings', async () => {
    localStorage.removeItem('waqti.focus.timer');
    const user = userEvent.setup();
    renderFocus();

    expect(screen.getByText('25:00')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Timer settings' }));
    expect(screen.getByLabelText('Focus (min)')).toBeInTheDocument();
  });
});
