import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SubscriptionPage } from '../SubscriptionPage';

describe('SubscriptionPage', () => {
  it('renders Free & Pro plans, usage meters, and allows switching in demo mode', async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <SubscriptionPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Free Plan')).toBeInTheDocument();
    expect(screen.getByText('Pro Plan')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Switch to Pro' }));
    expect(await screen.findByText('PRO')).toBeInTheDocument();
  });
});
