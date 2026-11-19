import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { NotificationsPage } from '../NotificationsPage';

describe('NotificationsPage', () => {
  it('renders notifications inbox, quiet hours toggle, and push support card', async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <NotificationsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Write the project proposal')).toBeInTheDocument();
    expect(screen.getByText('Browser & PWA Web Push')).toBeInTheDocument();

    await user.click(screen.getByRole('switch', { name: 'Enable quiet hours' }));
    expect(screen.getByLabelText('Start')).toBeInTheDocument();
  });
});
